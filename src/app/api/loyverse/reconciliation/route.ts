import { requireLoyverseOwner } from "@/modules/loyverse/lib/guard";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

const TOLERANCE = 1; // ฿ — en dessous = match (arrondis)

function bangkokDates(count: number): string[] {
  const out: string[] = [];
  const nowMs = Date.now() + 7 * 60 * 60 * 1000;
  for (let i = 0; i < count; i++) {
    const d = new Date(nowMs - i * 86400000);
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
  }
  return out;
}

function snapTotal(s: Record<string, unknown>): number {
  return (
    Number(s.sales_drinks_net ?? 0) +
    Number(s.sales_ticket_net ?? 0) +
    Number(s.sales_snack_net ?? 0) +
    Number(s.sales_goodies_net ?? 0) +
    Number(s.sales_card_surcharge ?? 0)
  );
}

function entryTotal(e: Record<string, unknown>): number {
  return (
    Number(e.sales_drinks_net ?? 0) +
    Number(e.sales_ticket_net ?? 0) +
    Number(e.sales_snack_net ?? 0) +
    Number(e.sales_goodies_net ?? 0) +
    Number(e.sales_card_surcharge ?? 0)
  );
}

// GET /api/loyverse/reconciliation?days=7 — compare snapshots vs daily_entries,
// persiste le log (probation write-back) et retourne le compteur "jours sans écart".
export async function GET(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const days = Math.min(14, Math.max(1, Number(url.searchParams.get("days") ?? 7) || 7));
  const dates = bangkokDates(days);
  const from = dates[dates.length - 1];
  const to = dates[0];

  const supabase = getSupabaseServerClient();
  const [locRes, snapRes, entryRes] = await Promise.all([
    supabase.from("locations").select("id, name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true),
    supabase
      .from("loyverse_daily_snapshots")
      .select("location_id, date, sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, sales_card_surcharge")
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("daily_entries")
      .select("location_id, entry_date, sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, sales_card_surcharge")
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", from)
      .lte("entry_date", to),
  ]);

  const locNames = new Map<string, string>(((locRes.data ?? []) as Array<{ id: string; name: string }>).map((l) => [l.id, l.name]));
  const snapByKey = new Map<string, number>();
  for (const s of (snapRes.data ?? []) as Record<string, unknown>[]) {
    const lid = s.location_id as string | null;
    if (!lid) continue;
    const key = `${s.date}|${lid}`;
    snapByKey.set(key, (snapByKey.get(key) ?? 0) + snapTotal(s));
  }
  const entryByKey = new Map<string, number>();
  for (const e of (entryRes.data ?? []) as Record<string, unknown>[]) {
    const lid = e.location_id as string | null;
    if (!lid) continue;
    entryByKey.set(`${e.entry_date}|${lid}`, entryTotal(e));
  }

  const locationIds = new Set<string>(Array.from(snapByKey.keys()).concat(Array.from(entryByKey.keys())).map((k) => k.split("|")[1] as string));

  type Row = {
    date: string; location_id: string; location_name: string | null;
    loyverse_total: number; accounting_total: number | null;
    diff: number; diff_pct: number; status: "match" | "mismatch" | "missing_snapshot" | "missing_entry";
  };
  const rows: Row[] = [];
  for (const date of dates) {
    for (const lid of Array.from(locationIds)) {
      const key = `${date}|${lid}`;
      const hasSnap = snapByKey.has(key);
      const hasEntry = entryByKey.has(key);
      if (!hasSnap && !hasEntry) continue;
      const loy = snapByKey.get(key) ?? 0;
      const acc = hasEntry ? (entryByKey.get(key) ?? 0) : null;
      let status: Row["status"];
      let diff = 0;
      let diffPct = 0;
      if (!hasSnap) { status = "missing_snapshot"; }
      else if (acc === null) { status = "missing_entry"; diff = loy; diffPct = 100; }
      else {
        diff = Math.round((loy - acc) * 100) / 100;
        diffPct = loy !== 0 ? Math.round((Math.abs(diff) / Math.abs(loy)) * 10000) / 100 : acc === 0 ? 0 : 100;
        status = Math.abs(diff) <= TOLERANCE ? "match" : "mismatch";
      }
      rows.push({
        date, location_id: lid, location_name: locNames.get(lid) ?? null,
        loyverse_total: Math.round(loy * 100) / 100, accounting_total: acc,
        diff, diff_pct: diffPct, status,
      });
    }
  }

  // Compteur "X jours sans différence" : jours consécutifs (depuis J) où tout est match.
  const byDate = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = byDate.get(r.date) ?? [];
    arr.push(r);
    byDate.set(r.date, arr);
  }
  let cleanDaysStreak = 0;
  for (const date of dates) {
    const dayRows = byDate.get(date) ?? [];
    if (dayRows.length === 0) break; // pas de données = on stoppe le compteur (pas un succès)
    if (dayRows.every((r) => r.status === "match")) cleanDaysStreak++;
    else break;
  }

  // Persiste le log (upsert idempotent) — best effort, ne bloque pas la lecture.
  try {
    if (rows.length > 0) {
      await supabase.from("loyverse_reconciliation_logs").upsert(
        rows.map((r) => ({
          organization_id: DEFAULT_ORG_ID,
          date: r.date,
          location_id: r.location_id,
          location_name: r.location_name,
          loyverse_total: r.loyverse_total,
          accounting_total: r.accounting_total ?? 0,
          diff: r.diff,
          diff_pct: r.diff_pct,
          status: r.status,
          checked_at: new Date().toISOString(),
        })),
        { onConflict: "organization_id,date,location_id" },
      );
    }
  } catch { /* best effort */ }

  const mismatches = rows.filter((r) => r.status !== "match").length;
  return Response.json({
    days,
    cleanDaysStreak,
    totalRows: rows.length,
    mismatches,
    probationTargetDays: 7,
    probationComplete: cleanDaysStreak >= 7,
    tolerance: TOLERANCE,
    rows: rows.sort((a, b) => b.date.localeCompare(a.date) || (a.location_name ?? "").localeCompare(b.location_name ?? "")),
  });
}
