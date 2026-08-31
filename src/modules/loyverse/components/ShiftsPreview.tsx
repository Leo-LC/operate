"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PillButton } from "@/components/ui/pill-button";
import { StoreIcon, ClockIcon, CoinsIcon, TagIcon, PackageIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

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
function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function capitalizeShop(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
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
          {moneyKeys
            .filter((k) => typeof shift[k] === "number")
            .map((k) => (
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
          <div className="rounded bg-[var(--bg-2)] p-3">
            <RenderValue value={shift} />
          </div>
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
  if (agg.length === 0) return <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Aucune vente par catégorie.</p>;
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
  if (agg.length === 0) return <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Aucune vente par article.</p>;
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
  const [date, setDate] = React.useState<string>(() => initialDate ?? bangkokYesterday());
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);
  const [shops, setShops] = React.useState<{ store_id: string; account_key: string; location_id: string | null }[]>([]);
  const [shiftRows, setShiftRows] = React.useState<ShiftRow[]>([]);
  const [salesRows, setSalesRows] = React.useState<SalesRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showShift, setShowShift] = React.useState(true);
  const [showCat, setShowCat] = React.useState(false);
  const [showItem, setShowItem] = React.useState(false);

  // Shop list — même source que LoyverseDashboard (dashboard + status)
  React.useEffect(() => {
    let cancelled = false;
    async function loadShops() {
      try {
        const [dashRes, statusRes] = await Promise.all([
          fetch(`/api/loyverse/dashboard?days=30&date=${bangkokToday()}`, { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/loyverse/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ]);
        const perStore = (dashRes?.per_store as { store_id: string; account_key: string; location_id: string | null }[] | undefined) ?? [];
        const map = new Map<string, { store_id: string; account_key: string; location_id: string | null }>();
        for (const s of perStore) map.set(s.store_id, { store_id: s.store_id, account_key: s.account_key, location_id: s.location_id });
        // Fallback via status accounts si dashboard vide (1er jour)
        if (map.size === 0 && statusRes?.accounts) {
          for (const a of statusRes.accounts as { key: string; label: string }[]) {
            // store_id = account key fallback — sera remplacé à la première sync
            if (!map.has(a.key)) map.set(a.key, { store_id: a.key, account_key: a.key, location_id: null });
          }
        }
        const list = Array.from(map.values()).sort((a, b) => a.account_key.localeCompare(b.account_key));
        if (!cancelled) {
          setShops(list);
          if (list.length > 0 && !selectedStore) setSelectedStore(list[0].store_id);
        }
      } catch {
        // ignore
      }
    }
    loadShops();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = React.useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, saRes] = await Promise.all([
        fetch(`/api/loyverse/shifts?date=${d}`, { cache: "no-store" }).then((x) => x.json()),
        fetch(`/api/loyverse/sales?date=${d}`, { cache: "no-store" }).then((x) => x.json()),
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

  React.useEffect(() => { fetchAll(date); }, [date, fetchAll]);

  const todayStr = bangkokToday();
  // Sauvegarde : chaque jour synchronisé est upserté dans loyverse_shifts_raw + loyverse_daily_sales (+ snapshot)
  // -> accessible même à J+60 si déjà sync une fois (garde-fou : jour < today déjà présent = jamais re-fetché)
  const shiftForStore = React.useMemo(() => shiftRows.filter((r) => r.store_id === selectedStore), [shiftRows, selectedStore]);
  const salesForStore = React.useMemo(() => salesRows.filter((r) => r.store_id === selectedStore), [salesRows, selectedStore]);
  const hasShift = shiftForStore.length > 0;
  const hasSales = salesForStore.length > 0;
  const isArchived = hasShift && hasSales;
  const needsSync = !isArchived && date !== todayStr;
  const totalShifts = shiftForStore.reduce((s, r) => s + (r.shift_count ?? r.shifts.length), 0);
  const selectedShop = shops.find((s) => s.store_id === selectedStore) ?? null;

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/loyverse/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dates: [date] }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Sync failed");
      await fetchAll(date);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card style={{ overflow: "visible" }}>
        <CardContent className="flex flex-col gap-3 py-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--fg-4)]">Shop</span>
            <div className="flex flex-wrap gap-1.5">
              {shops.length === 0 ? (
                <span className="text-xs text-[var(--fg-4)]">Chargement shops…</span>
              ) : (
                shops.map((shop) => (
                  <PillButton key={shop.store_id} active={selectedStore === shop.store_id} onClick={() => setSelectedStore(shop.store_id)} style={{ textTransform: "capitalize" }}>
                    {capitalizeShop(shop.account_key)}
                  </PillButton>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
            <Button variant="secondary" size="sm" onClick={() => setDate((d) => addDays(d, -1))} className="px-2">
              <ChevronLeftIcon className="size-4" />
            </Button>
            <label className="flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--fg-3)]">
              <ClockIcon className="size-3.5" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayStr} className="bg-transparent text-[13px] font-medium text-[var(--fg)] outline-none" />
            </label>
            <Button variant="secondary" size="sm" onClick={() => setDate((d) => addDays(d, 1))} disabled={date >= todayStr} className="px-2">
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fetchAll(date)} disabled={loading}>
              Recharger
            </Button>
            <Button size="sm" onClick={handleSync} disabled={syncing || loading}>
              {syncing ? "Synchronisation…" : needsSync ? "Synchroniser Loyverse" : "Synchroniser"}
            </Button>
            <span className="ml-auto flex items-center gap-2 text-xs">
              {isArchived ? <Pill tone="good" size="sm" dot>Archivé</Pill> : date === todayStr ? <Pill tone="neutral" size="sm" dot>Ouvert</Pill> : <Pill tone="warn" size="sm" dot>À synchroniser</Pill>}
              <span className="hidden text-[var(--fg-4)] sm:inline">{selectedShop ? capitalizeShop(selectedShop.account_key) : "—"} · {date}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-2">
            <span className="text-xs font-medium text-[var(--fg-4)]">Afficher :</span>
            <Button variant={showShift ? "secondary" : "outline"} size="sm" onClick={() => setShowShift((v) => !v)}>
              <ClockIcon className="size-3.5" /> {showShift ? "Masquer shift" : "Shift"}
            </Button>
            <Button variant={showCat ? "secondary" : "outline"} size="sm" onClick={() => setShowCat((v) => !v)}>
              <TagIcon className="size-3.5" /> {showCat ? "Masquer catégories" : "Catégories"}
            </Button>
            <Button variant={showItem ? "secondary" : "outline"} size="sm" onClick={() => setShowItem((v) => !v)}>
              <PackageIcon className="size-3.5" /> {showItem ? "Masquer articles" : "Articles"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

      {!selectedStore ? (
        <Card><CardContent className="py-10 text-center text-sm text-[var(--fg-4)]">Sélectionne un shop ci-dessus.</CardContent></Card>
      ) : loading ? (
        <Card className="animate-pulse"><CardContent className="py-6"><div className="h-4 w-32 rounded bg-[var(--line-2)]" /><div className="mt-3 h-20 rounded bg-[var(--line)]" /></CardContent></Card>
      ) : !hasShift && !hasSales ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-[var(--fg-3)]">Aucune donnée archivée pour {selectedShop ? capitalizeShop(selectedShop.account_key) : selectedStore} le {date}</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Ce jour est sauvegardé dès la première synchro (shift + ventes) et reste accessible même à J+60 — le garde-fou évite de re-fetcher un jour fermé déjà archivé.</p>
            <Button size="sm" className="mt-3" onClick={handleSync} disabled={syncing}>{syncing ? "…" : `Synchroniser ${date}`}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              <StoreIcon className="size-4 text-[var(--bronze)]" />
              <span className="capitalize">{selectedShop ? capitalizeShop(selectedShop.account_key) : shiftForStore[0]?.account_key ?? salesForStore[0]?.account_key ?? "—"}</span>
              <span className="font-mono text-xs font-normal text-[var(--fg-4)]">· {selectedStore.slice(0, 8)}… · {date}</span>
              <Pill tone={totalShifts ? "good" : "neutral"} size="sm" dot>{totalShifts} shifts</Pill>
              <span className="ml-auto text-xs font-normal text-[var(--fg-4)]">fetch {fmtDateTime(shiftForStore[0]?.fetched_at ?? salesForStore[0]?.fetched_at ?? null)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {showShift && (
              <div className="flex flex-col gap-2">
                {shiftForStore.length === 0 ? (
                  <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Pas de shift Loyverse pour ce jour (magasin fermé ou POS non ouvert).</p>
                ) : (
                  shiftForStore.map((r) => (
                    <div key={r.date} className="flex flex-col gap-1.5">
                      {r.shifts.length === 0 ? (
                        <p className="rounded bg-[var(--bg-2)] px-2 py-2 text-xs text-[var(--fg-4)]">Aucun shift ce jour.</p>
                      ) : (
                        r.shifts.map((s, idx) => <ShiftCard key={(s.id as string) ?? `${r.date}-${idx}`} shift={s as Record<string, unknown>} />)
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            {showCat && <div className="pt-1"><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--fg-3)]"><TagIcon className="size-3.5" /> Sales by category</p><SalesCategoryBlock rows={salesForStore} /></div>}
            {showItem && <div className="pt-1"><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--fg-3)]"><PackageIcon className="size-3.5" /> Sales by item</p><SalesItemBlock rows={salesForStore} /></div>}
            {!showShift && !showCat && !showItem && <p className="py-4 text-center text-xs text-[var(--fg-4)]">Choisis quoi afficher avec les boutons Shift / Catégories / Articles ci-dessus.</p>}
          </CardContent>
        </Card>
      )}
      <p className="text-center text-xs text-[var(--fg-4)]">Chaque jour synchronisé est sauvegardé dans <code>loyverse_shifts_raw</code> + <code>loyverse_daily_sales</code> + <code>loyverse_daily_snapshots</code> — accessible même à J+60 si déjà sync une fois (garde-fou : jour &lt; today déjà archivé = jamais re-fetché, seul today reste ouvert).</p>
    </div>
  );
}
