"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { StoreIcon, ClockIcon, CoinsIcon, TagIcon, PackageIcon } from "lucide-react";
import { DateRangePicker, type DateRangeValue } from "@/modules/reports/components/DateRangePicker";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function bangkokYesterday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);
}
function fmtTHB(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
}
function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(v);
  }
}
function isMoneyKey(k: string): boolean {
  return /amount|total|money|cash|card|payment|revenue|sales|tax|surcharge|discount|price/i.test(k);
}
function datesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const s = new Date(from + "T00:00:00Z");
  const e = new Date(to + "T00:00:00Z");
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

function RenderValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-[var(--fg-4)]">—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="font-mono text-xs tabular-nums">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-[var(--fg-4)]">[]</span>;
    return (
      <div className="flex flex-col gap-1">
        {value.map((v, i) => (
          <div key={i} className="rounded bg-[var(--bg-2)] px-2 py-1">
            <RenderValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return (
      <div className="grid gap-1.5">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs">
            <span className="min-w-[120px] shrink-0 font-medium text-[var(--fg-3)]">{k}</span>
            <span className="min-w-0 flex-1 text-[var(--fg-2)]">
              {typeof v === "object" && v !== null ? <RenderValue value={v} /> : <span className="font-mono tabular-nums">{isMoneyKey(k) && typeof v === "number" ? fmtTHB(v) : String(v ?? "—")}</span>}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-xs">{String(value)}</span>;
}

function ShiftCard({ shift }: { shift: Record<string, unknown> }) {
  const [open, setOpen] = React.useState(false);
  const id = (shift.id as string) ?? (shift.uuid as string) ?? "—";
  const storeId = (shift.store_id as string) ?? (shift.storeId as string) ?? null;
  const openedAt = (shift.opened_at as string) ?? (shift.created_at as string) ?? (shift.open_at as string) ?? null;
  const closedAt = (shift.closed_at as string) ?? (shift.updated_at as string) ?? null;
  const status = (shift.status as string) ?? null;
  const cashier = (shift.cashier_name as string) ?? (shift.employee_name as string) ?? (shift.closed_by as string) ?? null;
  const moneyKeys = ["cash_sales", "card_sales", "total_sales", "total_money", "opening_cash", "closing_cash", "cash_amount", "expected_cash", "difference"];
  const hasMoney = moneyKeys.some((k) => typeof shift[k] === "number");
  return (
    <div className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-semibold text-[var(--fg)]">{String(id).slice(0, 8)}…</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--fg-4)]">
            <ClockIcon className="size-3" />
            {fmtDateTime(openedAt)} → {fmtDateTime(closedAt)}
            {status && <Pill tone={status === "CLOSED" || status === "closed" ? "good" : "neutral"} size="sm">{status}</Pill>}
          </p>
          {(storeId || cashier) && (
            <p className="mt-1 text-[11px] text-[var(--fg-3)]">
              {storeId && <span className="font-mono">{String(storeId).slice(0, 8)}…</span>}
              {storeId && cashier && " · "}
              {cashier && <span>{cashier}</span>}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} className="shrink-0">
          {open ? "Masquer" : "Shift"}
        </Button>
      </div>
      {hasMoney && (
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--line)] bg-[var(--bg-2)] px-3 py-2">
          {moneyKeys.filter((k) => typeof shift[k] === "number").map((k) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium">
              <CoinsIcon className="size-3 text-[var(--fg-4)]" />
              <span className="text-[var(--fg-3)]">{k}</span>
              <span className="font-mono tabular-nums text-[var(--fg)]">{fmtTHB(shift[k] as number)}</span>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="border-t border-[var(--line)] px-3 py-3">
          <div className="rounded bg-[var(--bg-2)] p-3"><RenderValue value={shift} /></div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-[var(--fg-3)]">JSON brut</summary>
            <pre className="mt-2 max-h-[320px] overflow-auto rounded bg-[var(--fg)] p-3 text-[11px] leading-relaxed text-white">{JSON.stringify(shift, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

type ShiftRow = {
  id: string;
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  shifts: Record<string, unknown>[];
  shift_count: number;
  fetched_at: string;
};
type SalesRow = {
  id: string;
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  sales_by_category: { category_id: string | null; category_name: string; quantity: number; total_money: number }[];
  sales_by_item: { item_id: string | null; item_name: string; category_id: string | null; category_name: string | null; quantity: number; total_money: number }[];
  receipt_count: number;
  fetched_at: string;
};

function SalesCategoryBlock({ rows }: { rows: SalesRow[] }) {
  const agg = React.useMemo(() => {
    const m = new Map<string, { category_name: string; quantity: number; total_money: number }>();
    for (const r of rows) for (const c of r.sales_by_category ?? []) {
      const key = c.category_id ?? c.category_name;
      const prev = m.get(key);
      if (prev) { prev.quantity += c.quantity; prev.total_money += c.total_money; } else m.set(key, { category_name: c.category_name, quantity: c.quantity, total_money: c.total_money });
    }
    return Array.from(m.values()).sort((a, b) => b.total_money - a.total_money);
  }, [rows]);
  if (agg.length === 0) return <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Aucune vente par catégorie pour cette période.</p>;
  return (
    <div className="overflow-hidden rounded border border-[var(--line)]">
      <table className="w-full text-xs">
        <thead className="bg-[var(--bg-2)] text-[11px] uppercase tracking-wide text-[var(--fg-4)]">
          <tr><th className="px-2 py-1.5 text-left">Catégorie</th><th className="px-2 py-1.5 text-right">Qté</th><th className="px-2 py-1.5 text-right">Total</th></tr>
        </thead>
        <tbody>
          {agg.map((c) => (
            <tr key={c.category_name} className="border-t border-[var(--line)]">
              <td className="px-2 py-1.5 font-medium">{c.category_name}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{c.quantity}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtTHB(c.total_money)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function SalesItemBlock({ rows }: { rows: SalesRow[] }) {
  const agg = React.useMemo(() => {
    const m = new Map<string, { item_name: string; category_name: string | null; quantity: number; total_money: number }>();
    for (const r of rows) for (const it of r.sales_by_item ?? []) {
      const key = it.item_id ?? it.item_name;
      const prev = m.get(key);
      if (prev) { prev.quantity += it.quantity; prev.total_money += it.total_money; } else m.set(key, { item_name: it.item_name, category_name: it.category_name, quantity: it.quantity, total_money: it.total_money });
    }
    return Array.from(m.values()).sort((a, b) => b.total_money - a.total_money).slice(0, 100);
  }, [rows]);
  if (agg.length === 0) return <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Aucune vente par article pour cette période.</p>;
  return (
    <div className="overflow-hidden rounded border border-[var(--line)]">
      <table className="w-full text-xs">
        <thead className="bg-[var(--bg-2)] text-[11px] uppercase tracking-wide text-[var(--fg-4)]">
          <tr><th className="px-2 py-1.5 text-left">Article</th><th className="px-2 py-1.5 text-left">Cat.</th><th className="px-2 py-1.5 text-right">Qté</th><th className="px-2 py-1.5 text-right">Total</th></tr>
        </thead>
        <tbody>
          {agg.map((it) => (
            <tr key={it.item_name} className="border-t border-[var(--line)]">
              <td className="px-2 py-1.5 font-medium">{it.item_name}</td>
              <td className="px-2 py-1.5 text-[11px] text-[var(--fg-4)]">{it.category_name ?? "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{it.quantity}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtTHB(it.total_money)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {agg.length === 100 && <p className="bg-[var(--bg-2)] px-2 py-1 text-center text-[11px] text-[var(--fg-4)]">Top 100 affichés</p>}
    </div>
  );
}

export function ShiftsPreview({ initialDate }: { initialDate?: string }) {
  const [range, setRange] = React.useState<DateRangeValue>(() => {
    const y = initialDate ?? bangkokYesterday();
    return { from: y, to: y };
  });
  const [shiftRows, setShiftRows] = React.useState<ShiftRow[]>([]);
  const [salesRows, setSalesRows] = React.useState<SalesRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCat, setShowCat] = React.useState(false);
  const [showItem, setShowItem] = React.useState(false);

  const fetchAll = React.useCallback(async (r: DateRangeValue) => {
    setLoading(true);
    setError(null);
    try {
      const qs = `from=${r.from}&to=${r.to}`;
      const [sRes, saRes] = await Promise.all([
        fetch(`/api/loyverse/shifts?${qs}`, { cache: "no-store" }).then((x) => x.json()),
        fetch(`/api/loyverse/sales?${qs}`, { cache: "no-store" }).then((x) => x.json()),
      ]);
      if (sRes.error) throw new Error(sRes.error);
      if (saRes.error) throw new Error(saRes.error);
      setShiftRows((sRes.rows as ShiftRow[]) ?? []);
      setSalesRows((saRes.rows as SalesRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchAll(range); }, [range, fetchAll]);

  const dates = React.useMemo(() => datesInRange(range.from, range.to), [range]);
  const todayStr = bangkokToday();
  const loadedShiftDates = React.useMemo(() => new Set(shiftRows.map((r) => r.date)), [shiftRows]);
  const loadedSalesDates = React.useMemo(() => new Set(salesRows.map((r) => r.date)), [salesRows]);
  const missingDates = React.useMemo(
    () => dates.filter((d) => d !== todayStr && (!loadedShiftDates.has(d) || !loadedSalesDates.has(d))),
    [dates, loadedShiftDates, loadedSalesDates, todayStr],
  );
  const allLoaded = missingDates.length === 0;
  const totalShifts = shiftRows.reduce((s, r) => s + (r.shift_count ?? r.shifts.length), 0);

  // Group by store
  const byStore = React.useMemo(() => {
    const m = new Map<string, { account_key: string; store_id: string; location_id: string | null; shiftRows: ShiftRow[]; salesRows: SalesRow[] }>();
    for (const r of shiftRows) {
      const k = r.store_id;
      if (!m.has(k)) m.set(k, { account_key: r.account_key, store_id: r.store_id, location_id: r.location_id, shiftRows: [], salesRows: [] });
      m.get(k)!.shiftRows.push(r);
    }
    for (const r of salesRows) {
      const k = r.store_id;
      if (!m.has(k)) m.set(k, { account_key: r.account_key, store_id: r.store_id, location_id: r.location_id, shiftRows: [], salesRows: [] });
      m.get(k)!.salesRows.push(r);
    }
    // also ensure stores with no data still appear? we rely on existing rows
    return Array.from(m.values()).sort((a, b) => a.account_key.localeCompare(b.account_key));
  }, [shiftRows, salesRows]);

  const handleSync = async () => {
    const toSync = dates.filter((d) => d === todayStr || !loadedShiftDates.has(d) || !loadedSalesDates.has(d));
    if (toSync.length === 0) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/loyverse/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dates: toSync }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Sync failed");
      await fetchAll(range);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  const handleReload = () => fetchAll(range);

  return (
    <div className="flex flex-col gap-4">
      <Card style={{ overflow: "visible" }}>
        <CardContent className="flex flex-col gap-2 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker value={range} onChange={setRange} today={todayStr} />
            <Button variant="secondary" size="sm" onClick={handleReload} disabled={loading}>
              Recharger
            </Button>
            <Button size="sm" onClick={handleSync} disabled={syncing || loading}>
              {syncing ? "Synchronisation…" : `Synchroniser Loyverse${missingDates.length ? ` (${missingDates.length}j)` : ""}`}
            </Button>
            <span className="ml-auto flex items-center gap-2 text-xs">
              {allLoaded ? <Pill tone="good" size="sm" dot>Archivé</Pill> : <Pill tone="warn" size="sm" dot>{missingDates.length} à synchroniser</Pill>}
              <span className="hidden text-[var(--fg-4)] sm:inline">{byStore.length} shops · {totalShifts} shifts · {range.from} → {range.to}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-2">
            <span className="text-xs font-medium text-[var(--fg-4)]">Afficher :</span>
            <Button variant={showCat ? "secondary" : "outline"} size="sm" onClick={() => setShowCat((v) => !v)}>
              <TagIcon className="size-3.5" /> {showCat ? "Masquer catégories" : "Catégories"}
            </Button>
            <Button variant={showItem ? "secondary" : "outline"} size="sm" onClick={() => setShowItem((v) => !v)}>
              <PackageIcon className="size-3.5" /> {showItem ? "Masquer articles" : "Articles"}
            </Button>
            <span className="ml-1 text-xs text-[var(--fg-4)]">— Shift se gère par shift (bouton Shift)</span>
          </div>
        </CardContent>
      </Card>

      {error && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="py-6"><div className="h-4 w-32 rounded bg-[var(--line-2)]" /><div className="mt-3 h-20 rounded bg-[var(--line)]" /></CardContent></Card>
          ))}
        </div>
      ) : byStore.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-[var(--fg-3)]">Aucune donnée archivée pour {range.from} → {range.to}</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">{allLoaded ? "Période vide (jours fermés)." : `Clique Synchroniser pour charger ${missingDates.length} jour(s) manquant(s). Le garde-fou évite de re-fetcher les jours fermés déjà archivés.`}</p>
            {!allLoaded && (
              <Button size="sm" className="mt-3" onClick={handleSync} disabled={syncing}>{syncing ? "…" : `Synchroniser ${missingDates.slice(0,3).join(", ")}${missingDates.length>3?"…":""}`}</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {byStore.map((store) => {
            const storeShifts = store.shiftRows.flatMap((r) => r.shifts);
            const fetchedAt = store.shiftRows[0]?.fetched_at ?? store.salesRows[0]?.fetched_at ?? null;
            return (
              <Card key={store.store_id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                    <StoreIcon className="size-4 text-[var(--bronze)]" />
                    <span className="capitalize">{store.account_key}</span>
                    <span className="font-mono text-xs font-normal text-[var(--fg-4)]">· {store.store_id.slice(0, 8)}…</span>
                    <Pill tone={storeShifts.length ? "good" : "neutral"} size="sm" dot>{storeShifts.length} shifts</Pill>
                    <span className="ml-auto text-xs font-normal text-[var(--fg-4)]">fetch {fmtDateTime(fetchedAt)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {store.shiftRows.length === 0 ? (
                    <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Pas de shifts pour cette période.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {store.shiftRows
                        .slice()
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((r) => (
                          <div key={r.date} className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-[var(--fg-3)]">{r.date} · {r.shift_count} shift(s)</span>
                            {r.shifts.length === 0 ? (
                              <p className="rounded bg-[var(--bg-2)] px-2 py-2 text-xs text-[var(--fg-4)]">Aucun shift ce jour.</p>
                            ) : (
                              r.shifts.map((s, idx) => <ShiftCard key={(s.id as string) ?? `${r.date}-${idx}`} shift={s as Record<string, unknown>} />)
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {showCat && <div className="pt-1"><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--fg-3)]"><TagIcon className="size-3.5" /> Sales by category</p><SalesCategoryBlock rows={store.salesRows} /></div>}
                  {showItem && <div className="pt-1"><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--fg-3)]"><PackageIcon className="size-3.5" /> Sales by item</p><SalesItemBlock rows={store.salesRows} /></div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs text-[var(--fg-4)]">Sources : <code>loyverse_shifts_raw</code> + <code>loyverse_daily_sales</code> — dérivés <code>GET /receipts</code> + <code>GET /shifts</code> (Bangkok), 1 ligne/jour/shop. Garde-fou : jour fermé &lt; today déjà archivé = jamais re-fetché.</p>
    </div>
  );
}
