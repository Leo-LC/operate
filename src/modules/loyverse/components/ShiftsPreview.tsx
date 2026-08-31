"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PillButton } from "@/components/ui/pill-button";
import { StoreIcon, ClockIcon, TagIcon, PackageIcon, ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, ChevronDownIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { startOfMonth } from "date-fns";
import { bangkokToday, bangkokYesterday, addDays, capitalizeShop, parseDay, toDay } from "@/lib/loyverse/dates";

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
function formatSingleLabel(dateStr: string): string {
  const d = parseDay(dateStr);
  if (!d) return dateStr;
  const thisYear = new Date().getFullYear();
  return d.getFullYear() === thisYear ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const triggerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 32,
  minWidth: 150,
  padding: "0 var(--s-3)",
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  fontSize: 13,
  color: "var(--fg)",
  cursor: "pointer",
  transition: "background var(--dur) var(--ease)",
};
const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  zIndex: 50,
  width: "max-content",
  maxWidth: "min(92vw, 340px)",
  overflowX: "auto",
  borderRadius: "var(--r-lg)",
  border: "1px solid var(--line)",
  background: "var(--surface)",
  boxShadow: "var(--shadow-2)",
  padding: "var(--s-4)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

function SingleDatePicker({ value, onChange, today }: { value: string; onChange: (v: string) => void; today: string }) {
  const base = React.useMemo(() => parseDay(today) ?? new Date(), [today]);
  const selected = parseDay(value) ?? base;
  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(() => startOfMonth(selected));
  React.useEffect(() => {
    if (!open) setViewMonth(startOfMonth(parseDay(value) ?? base));
  }, [open, value, base]);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
      >
        <CalendarDaysIcon size={13} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{formatSingleLabel(value)}</span>
        <ChevronDownIcon size={13} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ ...panelStyle, left: 0 }}>
            <div className="nexus-dp">
              <DayPicker
                mode="single"
                required
                weekStartsOn={1}
                showOutsideDays
                today={base}
                month={viewMonth}
                onMonthChange={setViewMonth}
                selected={selected}
                onSelect={(d) => {
                  if (d) {
                    onChange(toDay(d));
                    setOpen(false);
                  }
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
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
    return Array.from(m.values()).sort((a, b) => b.total_money - a.total_money);
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
  const [showCat, setShowCat] = React.useState(true);
  const [showItem, setShowItem] = React.useState(true);

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
        if (map.size === 0 && statusRes?.accounts) {
          for (const a of statusRes.accounts as { key: string; label: string }[]) {
            if (!map.has(a.key)) map.set(a.key, { store_id: a.key, account_key: a.key, location_id: null });
          }
        }
        const list = Array.from(map.values()).sort((a, b) => a.account_key.localeCompare(b.account_key));
        if (!cancelled) {
          setShops(list);
          if (list.length > 0 && !selectedStore) setSelectedStore(list[0].store_id);
        }
      } catch {}
    }
    loadShops();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = React.useCallback(async (d: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyverse/day?date=${d}`, { cache: "no-store" }).then((x) => x.json());
      if (res.error) throw new Error(res.error);
      setShiftRows((res.shifts as ShiftRow[]) ?? []);
      setSalesRows((res.sales as SalesRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchAll(date); }, [date, fetchAll]);

  const todayStr = bangkokToday();
  const shiftForStore = React.useMemo(() => shiftRows.filter((r) => r.store_id === selectedStore), [shiftRows, selectedStore]);
  const salesForStore = React.useMemo(() => salesRows.filter((r) => r.store_id === selectedStore), [salesRows, selectedStore]);
  const hasShift = shiftForStore.length > 0;
  const hasSales = salesForStore.length > 0;
  const isArchived = hasShift && hasSales;
  const selectedShop = shops.find((s) => s.store_id === selectedStore) ?? null;
  const totalShifts = shiftForStore.reduce((s, r) => s + (r.shift_count ?? r.shifts.length), 0);

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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDate((d) => addDays(d, -1))} className="px-2">
              <ChevronLeftIcon className="size-4" />
            </Button>
            <SingleDatePicker value={date} onChange={setDate} today={todayStr} />
            <Button variant="secondary" size="sm" onClick={() => setDate((d) => addDays(d, 1))} disabled={date >= todayStr} className="px-2">
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fetchAll(date)} disabled={loading}>
              Recharger
            </Button>
            <Button size="sm" onClick={handleSync} disabled={syncing || loading}>
              {syncing ? "Synchronisation…" : isArchived ? "Synchroniser" : "Synchroniser Loyverse"}
            </Button>
            <span className="ml-auto flex items-center gap-2 text-xs">
              {isArchived ? <Pill tone="good" size="sm" dot>Archivé</Pill> : date === todayStr ? <Pill tone="neutral" size="sm" dot>Ouvert</Pill> : <Pill tone="warn" size="sm" dot>À synchroniser</Pill>}
              <span className="hidden text-[var(--fg-4)] sm:inline">{selectedShop ? capitalizeShop(selectedShop.account_key) : "—"} · {date}</span>
            </span>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-3">
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
            <p className="mt-1 text-xs text-[var(--fg-4)]">Ce jour est sauvegardé dès la première synchro (shift + ventes) et reste accessible même à J+60.</p>
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
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg-3)]"><ClockIcon className="size-3.5" /> Shift — détail brut</p>
                {shiftForStore.length === 0 ? (
                  <p className="rounded bg-[var(--bg-2)] px-3 py-3 text-center text-xs text-[var(--fg-4)]">Pas de shift Loyverse pour ce jour.</p>
                ) : (
                  shiftForStore.flatMap((r) =>
                    r.shifts.length === 0
                      ? [<p key={r.date} className="rounded bg-[var(--bg-2)] px-2 py-2 text-xs text-[var(--fg-4)]">Aucun shift ce jour.</p>]
                      : r.shifts.map((s, idx) => (
                          <div key={(s.id as string) ?? `${r.date}-${idx}`} className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] p-3">
                            <RenderValue value={s} />
                          </div>
                        )),
                  )
                )}
              </div>
            )}
            {showCat && <div className="pt-1"><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--fg-3)]"><TagIcon className="size-3.5" /> Sales by category</p><SalesCategoryBlock rows={salesForStore} /></div>}
            {showItem && <div className="pt-1"><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--fg-3)]"><PackageIcon className="size-3.5" /> Sales by item</p><SalesItemBlock rows={salesForStore} /></div>}
            {!showShift && !showCat && !showItem && <p className="py-4 text-center text-xs text-[var(--fg-4)]">Choisis quoi afficher avec les boutons Shift / Catégories / Articles ci-dessus.</p>}
          </CardContent>
        </Card>
      )}
      <ChallengesPreviewCard month={date.slice(0, 7)} />

      <p className="text-center text-xs text-[var(--fg-4)]">Chaque jour synchronisé est sauvegardé dans <code>loyverse_shifts_raw</code> + <code>loyverse_daily_sales</code> + <code>loyverse_daily_snapshots</code> — accessible même à J+60 si déjà sync une fois (garde-fou : jour &lt; today déjà archivé = jamais re-fetché).</p>
    </div>
  );
}

function ChallengesPreviewCard({ month }: { month: string }) {
  const [rows, setRows] = React.useState<
    { location_id: string; location_name: string; period: number; proposed_entry_count: number; proposed_snacks_sold: number; existing_entry_count: number | null; existing_snacks_sold: number | null; unmapped?: boolean }[]
  >([]);
  const [unmapped, setUnmapped] = React.useState<typeof rows>([]);
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const refresh = React.useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/loyverse/challenges-preview?month=${month}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setRows((j.preview as typeof rows) ?? []);
        setUnmapped((j.unmapped as typeof rows) ?? []);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [month]);
  React.useEffect(() => {
    const cleanup = refresh();
    return cleanup;
  }, [refresh]);
  const handleFill = async (force: boolean) => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/loyverse/challenges-write", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, dryRun: false, force }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Write failed");
      setResult(`${j.location_upserted} périodes remplies, ${j.location_skipped} déjà OK, ${j.location_exists_overwritten ?? 0} existantes ignorées (force=false)`);
      await new Promise((r) => setTimeout(r, 300));
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TagIcon className="size-4 text-[var(--bronze)]" /> Challenges — pré-remplissage {month}
          <span className="ml-auto text-xs font-normal text-[var(--fg-4)]">entrées = TICKETS · snacks = SNACKS (Samui A ENTRY inclus)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => handleFill(false)} disabled={syncing || loading}>
            {syncing ? "Remplissage…" : "Remplir Challenges"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleFill(true)} disabled={syncing || loading}>
            Forcer (écrase)
          </Button>
          <span className="text-xs text-[var(--fg-4)]">n&apos;écrase pas les saisies existantes sauf Forcer — CRON quotidien 23:30 le fera auto</span>
          {result && <span className="ml-auto text-xs font-medium text-[var(--good)]">{result}</span>}
        </div>
        <p className="text-xs text-[var(--fg-4)]">Compare ce que donnerait Loyverse (tickets/snacks du mois) vs ce qui est déjà saisi dans <code>location_entries</code>.</p>
        {loading ? (
          <div className="h-20 animate-pulse rounded bg-[var(--line-2)]" />
        ) : error ? (
          <div className="rounded bg-[var(--bad-soft)] px-3 py-2 text-xs text-[var(--bad)]">{error}</div>
        ) : rows.length === 0 ? (
          <p className="rounded bg-[var(--bg-2)] px-3 py-6 text-center text-xs text-[var(--fg-4)]">Aucune donnée Loyverse pour {month}.</p>
        ) : (
          <>
            <div className="overflow-auto rounded border border-[var(--line)]">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-2)] text-[11px] uppercase tracking-wide text-[var(--fg-4)]">
                  <tr><th className="px-2 py-1.5 text-left">Shop / Période</th><th className="px-2 py-1.5 text-right">Entrées (Loyverse)</th><th className="px-2 py-1.5 text-right">Entrées (actuel)</th><th className="px-2 py-1.5 text-right">Snacks (Loyverse)</th><th className="px-2 py-1.5 text-right">Snacks (actuel)</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const ecDiff = r.existing_entry_count !== null && r.proposed_entry_count !== r.existing_entry_count;
                    const ssDiff = r.existing_snacks_sold !== null && r.proposed_snacks_sold !== r.existing_snacks_sold;
                    return (
                      <tr key={`${r.location_id}-${r.period}`} className="border-t border-[var(--line)]">
                        <td className="px-2 py-1.5 font-medium">{r.location_name} · P{r.period}</td>
                        <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${ecDiff ? "bg-[var(--warn-soft)]" : ""}`}>{r.proposed_entry_count}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--fg-4)]">{r.existing_entry_count ?? "—"}</td>
                        <td className={`px-2 py-1.5 text-right font-mono tabular-nums ${ssDiff ? "bg-[var(--warn-soft)]" : ""}`}>{r.proposed_snacks_sold}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[var(--fg-4)]">{r.existing_snacks_sold ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {unmapped.length > 0 && (
              <div className="rounded border border-[var(--warn)] bg-[var(--warn-soft)] px-3 py-2">
                <p className="text-xs font-semibold text-[var(--warn)]">Shops non mappés détectés — Silom probablement ici :</p>
                <div className="mt-1 overflow-auto rounded border border-[var(--line)] bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-2)] text-[11px] uppercase tracking-wide text-[var(--fg-4)]">
                      <tr><th className="px-2 py-1 text-left">Store Loyverse</th><th className="px-2 py-1 text-right">P</th><th className="px-2 py-1 text-right">Entrées</th><th className="px-2 py-1 text-right">Snacks</th></tr>
                    </thead>
                    <tbody>
                      {unmapped.map((r) => (
                        <tr key={`${r.location_id}-${r.period}`} className="border-t border-[var(--line)]">
                          <td className="px-2 py-1 font-mono text-[11px]">{r.location_name}</td>
                          <td className="px-2 py-1 text-right">{r.period}</td>
                          <td className="px-2 py-1 text-right font-mono">{r.proposed_entry_count}</td>
                          <td className="px-2 py-1 text-right font-mono">{r.proposed_snacks_sold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-[11px] text-[var(--fg-4)]">Ajoute le <code>loyverse_store_id</code> dans <code>locations</code> pour ce shop (via Admin → Locations ou SQL) puis resync.</p>
              </div>
            )}
          </>
        )}
        <p className="text-[11px] text-[var(--fg-4)]">Jaune = écart avec la saisie actuelle. Pour l&apos;instant on n&apos;écrit rien — dis-moi si les chiffres te semblent bons et je branche le remplissage auto.</p>
      </CardContent>
    </Card>
  );
}
