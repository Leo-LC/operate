// Backfill one-shot : remplit loyverse_daily_sales.prices_by_item sur les
// N derniers jours Bangkok (par défaut 30, limite de l'API receipts Loyverse)
// à partir des receipts re-fetchés du jour. Ne touche NI aux snapshots,
// NI à l'accounting/write-back — patch de la colonne prices_by_item seulement.
//
// Usage: node --env-file=.env.local scripts/backfill-item-prices.mjs [days]
// (exécution idempotente : ré-upsert la colonne pour les dates traitées)

const BASE = (process.env.LOYVERSE_API_BASE ?? "https://api.loyverse.com/v1.0").replace(/\/$/, "");
const DAYS = Math.max(1, Math.min(30, Number(process.argv[2] ?? "30")));
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

const { createClient } = await import("@supabase/supabase-js");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  process.exitCode = 1;
  process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function bangkokToday() {
  return new Date(Date.now() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}
function offsetDate(days) {
  return new Date(Date.now() + days * 86_400_000 + BKK_OFFSET_MS).toISOString().slice(0, 10);
}
function rangeForDay(date) {
  return {
    created_at_min: new Date(`${date}T00:00:00+07:00`).toISOString(),
    created_at_max: new Date(`${date}T23:59:59.999+07:00`).toISOString(),
  };
}
function normalizeName(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function countUppercase(name) {
  let n = 0;
  for (const c of name) if (c >= "A" && c <= "Z") n++;
  return n;
}
function round2(x) {
  return Math.round(x * 100) / 100;
}

async function receiptsPage(token, params) {
  const url = new URL(`${BASE}/receipts`);
  url.searchParams.set("limit", "250");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
  if (res.status === 429) {
    const wait = Math.max(Number(res.headers.get("Retry-After") ?? "3"), 3) * 1000;
    await sleep(wait);
    return receiptsPage(token, params);
  }
  if (!res.ok) throw new Error(`Loyverse ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAllReceipts(token, storeId, date) {
  const range = rangeForDay(date);
  const out = [];
  let cursor;
  for (let page = 0; page < 50; page++) {
    const body = await receiptsPage(token, { store_id: storeId, created_at_min: range.created_at_min, created_at_max: range.created_at_max, cursor });
    const chunk = Array.isArray(body.receipts) ? body.receipts : [];
    out.push(...chunk);
    cursor = typeof body.cursor === "string" && body.cursor ? body.cursor : null;
    if (!cursor) break;
  }
  return out;
}

/** Même règles que computeSalesAggregates côté app (cancelled exclu, REFUND signé). */
function computePrices(receipts, date, storeId) {
  const byNorm = new Map();
  for (const r of receipts) {
    const localDate = (r.receipt_date ?? r.created_at ?? "").slice(0, 10);
    if (localDate !== date) continue;
    if (r.store_id !== storeId) continue;
    if (r.cancelled_at) continue;
    const mult = r.receipt_type === "REFUND" ? -1 : 1;
    for (const line of r.line_items ?? []) {
      const rawName = (line.item_name ?? "").trim();
      if (!rawName) continue;
      const qty = line.quantity ?? 0;
      const total = line.total_money ?? 0;
      const qtyAbs = Math.abs(qty) || 1;
      const unit =
        line.unit_price != null && line.unit_price !== 0
          ? Math.abs(line.unit_price)
          : Math.abs(total) / qtyAbs;
      const p = round2(unit);
      const key = normalizeName(rawName);
      let entry = byNorm.get(key);
      if (!entry) {
        entry = { display: rawName, buckets: new Map() };
        byNorm.set(key, entry);
      } else if (countUppercase(rawName) > countUppercase(entry.display)) {
        entry.display = rawName;
      }
      const bucket = entry.buckets.get(p) ?? { p, n: 0, q: 0, m: 0 };
      bucket.n += 1;
      bucket.q += qty * mult;
      bucket.m += total * mult;
      entry.buckets.set(p, bucket);
    }
  }
  const out = {};
  for (const entry of byNorm.values()) {
    out[entry.display] = Array.from(entry.buckets.values()).sort((a, b) => a.p - b.p);
  }
  return out;
}

async function main() {
  const today = bangkokToday();
  const dates = [];
  for (let i = 1; i <= DAYS; i++) dates.push(offsetDate(-i)); // hier → N-30 (aujourd'hui est géré par le sync)
  dates.sort();

  const { data: accounts, error } = await supabase.from("loyverse_accounts").select("key, label, token, is_active").eq("is_active", true).order("key");
  if (error) throw error;
  const active = (accounts ?? [])
    .filter((a) => a.key?.trim() && a.token?.trim())
    .map((a) => ({ ...a, key: a.key.trim(), label: a.label?.trim() || a.key.trim(), token: a.token.trim() }));
  if (active.length === 0) throw new Error("Aucun compte Loyverse actif dans loyverse_accounts");

  let stats = { dates: 0, rows: 0, items: 0 };
  for (const acc of active) {
    const storesRes = await fetch(`${BASE}/stores`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${acc.token}` },
    });
    if (!storesRes.ok) throw new Error(` Stores ${acc.key} HTTP ${storesRes.status}: ${(await storesRes.text()).slice(0, 200)}`);
    const storesData = await storesRes.json();
    const stores = storesData?.stores ?? [];
    console.log(`\n=== ${acc.key} (${acc.label ?? acc.key}) — ${stores.length} stores`);
    for (const store of stores) {
      for (const date of dates) {
        const receipts = await fetchAllReceipts(acc.token, store.id, date);
        if (receipts.length === 0) continue;
        const prices = computePrices(receipts, date, store.id);
        const itemCount = Object.keys(prices).length;
        // Patch de la colonne seulement — ligne daily_sales doit exister
        const { data: patched, error: upErr } = await supabase
          .from("loyverse_daily_sales")
          .update({ prices_by_item: prices, updated_at: new Date().toISOString() })
          .eq("account_key", acc.key.trim())
          .eq("store_id", store.id)
          .eq("date", date)
          .select("id");
        if (upErr) throw upErr;
        stats.dates += 1;
        stats.rows += patched?.length ?? 0;
        stats.items += itemCount * (patched?.length ?? 0);
        console.log(`${store.id} ${date}: receipts=${receipts.length} items=${itemCount} patchedRows=${patched?.length ?? 0}`);
        await sleep(250); // rate-limit friendly (10 rps max)
      }
    }
  }
  console.log(`\nTerminé: ${stats.dates} (store,date) vus, ${stats.rows} lignes patched, ${stats.items} (item,bucket) écrits`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
