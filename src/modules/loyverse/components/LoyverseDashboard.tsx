"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { PillButton } from "@/components/ui/pill-button";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { RefreshCwIcon, TrendingUpIcon, ShoppingBagIcon, UsersIcon, ClockIcon, ReceiptIcon } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";
import { DateRangePicker } from "@/modules/reports/components/DateRangePicker";

function fmtTHB(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
}
function fmtInt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}
function fmtDelta(pct: number | null) {
  if (pct === null || !Number.isFinite(pct)) return null;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return 1;
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

type DashboardKpis = {
  revenue_total: number;
  vat_7: number;
  ticket_count: number;
  receipt_count: number;
  snacks_sold: number;
  store_count: number;
  avg_ticket: number;
  delta_vs_week_ago_pct: number | null;
  delta_vs_prev_period_pct?: number | null;
  prev_revenue_total?: number;
};
type PerStore = {
  account_key: string;
  store_id: string;
  location_id: string | null;
  date: string;
  revenue_total: number;
  ticket_count: number;
  receipt_count: number;
  snacks_sold: number;
  avg_ticket: number;
  buckets: { drinks: number; ticket: number; snack: number; goodies: number; surcharge: number };
  payments: { cash: number; scan: number; credit_card: number };
  unmapped: { line_items: number; payments: number };
};
type DashboardData = {
  date_range: { start: string; end: string; days: number; prev_start?: string; prev_end?: string };
  kpis: DashboardKpis;
  per_store: PerStore[];
  snapshots: Array<{ date: string; revenue_total: number; account_key: string; store_id: string; vat_7?: number; ticket_count?: number; tickets_sold?: number; receipt_count?: number; snacks_sold?: number; sale_count?: number; refund_count?: number; location_id?: string | null; sales_drinks_net?: number; sales_ticket_net?: number; sales_snack_net?: number; sales_goodies_net?: number; sales_card_surcharge?: number; payment_cash?: number; payment_scan?: number; payment_credit_card?: number } & Record<string, unknown>>;
  prev_snapshots?: Array<Record<string, unknown>>;
};
type StatusData = {
  configured: boolean;
  accounts: { key: string; label: string }[];
  account_count: number;
  last_run: {
    id: string;
    status: string;
    triggered_by: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    total_snapshots: number;
    per_account: { account_key: string; stores: number; snapshots: number; error?: string }[];
    error: string | null;
  } | null;
  snapshot_count: number;
  error: string | null;
};

function Donut({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="py-6 text-center text-sm text-[var(--fg-4)]">Pas de données</div>;
  let acc = 0;
  const segments = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.value;
    const end = (acc / total) * 360;
    const large = end - start > 180 ? 1 : 0;
    const r = 36;
    const cx = 40, cy = 40;
    const rad = (deg: number) => (deg - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(rad(start));
    const y1 = cy + r * Math.sin(rad(start));
    const x2 = cx + r * Math.cos(rad(end));
    const y2 = cy + r * Math.sin(rad(end));
    const dAttr = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return <path key={d.label} d={dAttr} fill={colors[i % colors.length]} />;
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={80} height={80} viewBox="0 0 80 80" className="shrink-0">
        <circle cx={40} cy={40} r={36} fill="var(--line-2)" />
        {segments}
        <circle cx={40} cy={40} r={18} fill="var(--surface)" />
      </svg>
      <div className="flex flex-col gap-1.5 text-xs">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="text-[var(--fg-3)]">{d.label}</span>
            <span className="ml-auto font-mono tabular-nums text-[var(--fg-2)]">{fmtTHB(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopPills({
  locations,
  selected,
  onChange,
}: {
  locations: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    if (selected.length === 0) {
      onChange([id]);
      return;
    }
    if (selected.includes(id)) {
      const next = selected.filter((s) => s !== id);
      onChange(next.length === 0 ? [] : next);
    } else {
      onChange([...selected, id]);
    }
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <PillButton active={selected.length === 0} onClick={() => onChange([])}>
        All shops
      </PillButton>
      {locations.map((loc) => {
        const active = selected.includes(loc.id);
        return (
          <PillButton key={loc.id} active={active} onClick={() => toggle(loc.id)}>
            {loc.name}
          </PillButton>
        );
      })}
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: number; revenue: number; count: number }[] }) {
  const filtered = data.filter((d) => d.hour >= 9 && d.hour <= 21);
  const display = filtered.length ? filtered : data;
  const max = Math.max(...display.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end justify-center gap-1.5 sm:gap-2 w-full py-2">
      {display.map((d) => (
        <div key={d.hour} className="flex flex-1 max-w-[72px] flex-col items-center gap-1">
          <div className="flex w-full justify-center" style={{ height: 80, alignItems: "flex-end" }}>
            <div
              style={{ width: "70%", maxWidth: 32, height: `${(d.revenue / max) * 80}px`, background: "var(--bronze)", borderRadius: "var(--r-sm)  var(--r-sm) 0 0", transition: "height 0.3s" }}
              title={`${d.hour}h: ${fmtTHB(d.revenue)} (${d.count} passages)`}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]">{d.hour}h</span>
        </div>
      ))}
    </div>
  );
}

function DailyRevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  const [hover, setHover] = React.useState<{ idx: number; x: number; y: number } | null>(null);
  if (data.length === 0) return <div className="py-6 text-center text-sm text-[var(--fg-4)]">Pas de données</div>;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const W = 640;
  const H = 160;
  const padLeft = 48;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const usableW = W - padLeft - padRight;
  const usableH = H - padTop - padBottom;
  const stepX = data.length < 2 ? usableW : usableW / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + usableH - (d.revenue / max) * usableH;
    return { x, y, d };
  });
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1]!.x},${padTop + usableH} L ${pts[0]!.x},${padTop + usableH} Z`;
  const yTicks = 4;
  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[180px] select-none"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        {/* grid lines */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = padTop + (usableH / yTicks) * i;
          const val = max - (max / yTicks) * i;
          return (
            <g key={i}>
              <line x1={padLeft} x2={W - padRight} y1={y} y2={y} stroke="var(--line-2)" strokeWidth={1} strokeDasharray={i === yTicks ? "0" : "3 4"} />
              <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize={9} fill="var(--fg-4)" className="font-mono tabular-nums">
                {fmtTHB(val)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="var(--bronze)" opacity={0.12} />
        <path d={linePath} stroke="var(--bronze)" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={p.d.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover?.idx === i ? 5 : 3.5}
              fill="var(--bronze)"
              stroke="white"
              strokeWidth={1.5}
              style={{ transition: "r 0.15s ease", cursor: "pointer" }}
              onMouseEnter={() => setHover({ idx: i, x: p.x, y: p.y })}
              onMouseMove={() => setHover({ idx: i, x: p.x, y: p.y })}
            />
            {/* invisible hit area for easier hover */}
            <rect x={p.x - stepX / 2} y={padTop} width={stepX} height={usableH} fill="transparent" onMouseEnter={() => setHover({ idx: i, x: p.x, y: p.y })} />
          </g>
        ))}
        {/* hover guide line */}
        {hover && <line x1={pts[hover.idx]!.x} x2={pts[hover.idx]!.x} y1={padTop} y2={padTop + usableH} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 shadow-md"
          style={{
            left: `min(calc(${(pts[hover.idx]!.x / W) * 100}% + 8px), calc(100% - 160px))`,
            top: 8,
            transition: "left 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <div className="text-xs font-medium text-[var(--fg)]">{pts[hover.idx]!.d.date}</div>
          <div className="font-mono text-xs tabular-nums text-[var(--bronze)]">{fmtTHB(pts[hover.idx]!.d.revenue)}</div>
        </div>
      )}
      <div className="flex justify-between px-1 pt-1">
        {data.map((d) => (
          <span key={d.date} className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]" style={{ width: `${100 / data.length}%`, textAlign: "center" }}>
            {d.date.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LoyverseDashboard({ canSync = true }: { canSync?: boolean }) {
  const [dateRange, setDateRange] = React.useState<{ from: string; to: string }>(() => {
    const t = bangkokToday();
    return { from: t, to: t };
  });
  const rangeDays = React.useMemo(() => daysBetween(dateRange.from, dateRange.to), [dateRange]);
  const effectiveEnd = dateRange.to;
  const [selectedStores, setSelectedStores] = React.useState<string[]>([]);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [status, setStatus] = React.useState<StatusData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const [curveData, setCurveData] = React.useState<number[] | null>(null);
  const [hourlyData, setHourlyData] = React.useState<{ hour: number; revenue: number; count: number }[] | null>(null);
  const [hourlyLoading, setHourlyLoading] = React.useState(false);

  const fetchDashboard = React.useCallback(async (endStr: string, days: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyverse/dashboard?date=${endStr}&days=${days}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Dashboard fetch failed");
      setData(json as DashboardData);
      const snaps = (json.snapshots ?? []) as Array<{ date: string; revenue_total: number }>;
      const byDate = new Map<string, number>();
      for (const s of snaps) {
        // only current period for sparkline (optional: keep all)
        byDate.set(s.date, (byDate.get(s.date) ?? 0) + Number(s.revenue_total ?? 0));
      }
      const sortedDates = Array.from(byDate.keys()).sort();
      setCurveData(sortedDates.map((d) => byDate.get(d) ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/loyverse/status", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setStatus(json as StatusData);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard(effectiveEnd, rangeDays);
    fetchStatus();
  }, [effectiveEnd, rangeDays, fetchDashboard, fetchStatus]);

  React.useEffect(() => {
    // Hourly only for single day and single shop
    if (rangeDays !== 1 || selectedStores.length !== 1 || !data?.per_store.length) {
      setHourlyData(null);
      return;
    }
    const selId = selectedStores[0]!;
    const store = data.per_store.find((s) => s.store_id === selId || s.account_key === selId);
    if (!store) {
      setHourlyData(null);
      return;
    }
    setHourlyLoading(true);
    fetch(`/api/loyverse/hourly?date=${effectiveEnd}&store_id=${store.store_id}&account_key=${store.account_key}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.hourly) setHourlyData(j.hourly);
      })
      .catch(() => setHourlyData(null))
      .finally(() => setHourlyLoading(false));
  }, [effectiveEnd, rangeDays, selectedStores, data]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const body: Record<string, unknown> = {};
      if (rangeDays > 1) body.days = rangeDays;
      // sync the selected range's end date if single day not today
      if (rangeDays === 1 && effectiveEnd !== bangkokToday()) body.dates = [effectiveEnd];
      const res = await fetch("/api/loyverse/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      await Promise.all([fetchDashboard(effectiveEnd, rangeDays), fetchStatus()]);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  const allStoresRaw = React.useMemo(() => data?.per_store ?? [], [data?.per_store]);
  const shopLocations = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allStoresRaw) {
      const label = s.account_key;
      map.set(s.store_id, label);
    }
    for (const a of status?.accounts ?? []) {
      const hasStore = Array.from(map.keys()).some((k) => k === a.key || map.get(k)?.startsWith(a.key));
      if (!hasStore) map.set(a.key, a.label);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allStoresRaw, status]);

  const perStore = React.useMemo(() => {
    if (selectedStores.length === 0) return allStoresRaw;
    return allStoresRaw.filter((s) => selectedStores.includes(s.store_id) || selectedStores.includes(s.account_key));
  }, [selectedStores, allStoresRaw]);

  const filteredKpis = React.useMemo(() => {
    const kpis = data?.kpis ?? null;
    if (!kpis) return null;
    if (selectedStores.length === 0) return kpis;
    // Recompute filtered from perStore (already aggregated over current period in API)
    const rev = perStore.reduce((s, r) => s + r.revenue_total, 0);
    // Compute vat filtered via snapshots current period filtered
    const snapshots = (data?.snapshots ?? []) as Array<Record<string, unknown>>;
    const startStr = data?.date_range.start ?? effectiveEnd;
    const endStr = data?.date_range.end ?? effectiveEnd;
    const filteredCurrentSnaps = snapshots.filter((r) => {
      const d = String((r as { date?: string }).date ?? "");
      if (d < startStr || d > endStr) return false;
      const sid = String((r as { store_id?: string }).store_id ?? "");
      const ak = String((r as { account_key?: string }).account_key ?? "");
      return selectedStores.includes(sid) || selectedStores.includes(ak);
    });
    const filteredVat = filteredCurrentSnaps.reduce((a, b) => a + Number((b as unknown as { vat_7?: number }).vat_7 ?? 0), 0);
    const filteredSnacks = perStore.reduce((s, r) => s + r.snacks_sold, 0);
    const filteredTickets = perStore.reduce((s, r) => s + r.ticket_count, 0);
    const filteredReceipts = perStore.reduce((s, r) => s + r.receipt_count, 0);
    // Delta filtered: compare current filtered rev vs previous period filtered rev
    const prevStart = data?.date_range.prev_start;
    const prevEnd = data?.date_range.prev_end;
    let deltaFiltered: number | null = null;
    if (prevStart && prevEnd) {
      const filteredPrevSnaps = snapshots.filter((r) => {
        const d = String((r as { date?: string }).date ?? "");
        if (d < prevStart || d > prevEnd) return false;
        const sid = String((r as { store_id?: string }).store_id ?? "");
        const ak = String((r as { account_key?: string }).account_key ?? "");
        return selectedStores.includes(sid) || selectedStores.includes(ak);
      });
      const prevRev = filteredPrevSnaps.reduce((s, r) => s + Number((r as { revenue_total?: number }).revenue_total ?? 0), 0);
      if (prevRev > 0) deltaFiltered = ((rev - prevRev) / prevRev) * 100;
    } else {
      deltaFiltered = kpis.delta_vs_week_ago_pct ?? null;
    }

    return {
      revenue_total: rev,
      vat_7: filteredVat || kpis.vat_7 * (perStore.length / Math.max(1, kpis.store_count)),
      ticket_count: filteredTickets,
      receipt_count: filteredReceipts,
      snacks_sold: filteredSnacks,
      store_count: perStore.length,
      avg_ticket: filteredTickets > 0 ? rev / filteredTickets : 0,
      delta_vs_week_ago_pct: deltaFiltered,
      delta_vs_prev_period_pct: deltaFiltered,
    } as DashboardKpis;
  }, [selectedStores, perStore, data, effectiveEnd]);

  if (status && !status.configured) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Loyverse" eyebrow="Operations" />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--fg-3)]">Loyverse n&apos;est pas configuré.</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Ajoutez LOYVERSE_ACCOUNTS dans Vercel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lastRun = status?.last_run;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _hasSyncErrors = Boolean(lastRun?.per_account?.some((a) => a.error) || lastRun?.error);
  const kpi = filteredKpis;
  const snackAmount = perStore.reduce((s, r) => s + r.buckets.snack, 0);
  const snackPct = kpi && kpi.ticket_count > 0 ? (kpi.snacks_sold / kpi.ticket_count) * 100 : 0;
  const merchAmount = perStore.reduce((s, r) => s + r.buckets.goodies, 0);
  const deltaVal = kpi?.delta_vs_week_ago_pct ?? kpi?.delta_vs_prev_period_pct ?? null;
  const deltaLabel = rangeDays === 1 ? "vs veille" : `vs ${rangeDays}j précédents`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loyverse"
        eyebrow="Operations"
        actions={
          <div className="flex items-center gap-2">
            {canSync && (
              <Button onClick={handleSync} disabled={syncing} size="default">
                <RefreshCwIcon className={cn("size-3.5", syncing && "animate-spin")} />
                {syncing ? "Sync…" : "Synchroniser"}
              </Button>
            )}
            {lastRun?.finished_at && (
              <span className="hidden text-xs text-[var(--fg-4)] sm:inline">
                {lastRun.status === "completed" ? "✓" : "●"} {new Date(lastRun.finished_at).toLocaleDateString("fr-FR")} {new Date(lastRun.finished_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--fg-3)]">Période :</span>
          <DateRangePicker
            value={dateRange}
            onChange={(range) => setDateRange(range)}
            today={bangkokToday()}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Shops</span>
          <ShopPills locations={shopLocations} selected={selectedStores} onChange={setSelectedStores} />
        </div>
      </div>

      {syncError && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{syncError}</div>}
      {error && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 w-20 rounded bg-[var(--line-2)]" />
                <div className="mt-3 h-6 w-24 rounded bg-[var(--line)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : kpi ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card>
            <CardContent>
              <Stat
                label="CA"
                value={fmtTHB(kpi.revenue_total)}
                delta={fmtDelta(deltaVal) ? `${fmtDelta(deltaVal)} ${deltaLabel}` : undefined}
                deltaDir={deltaVal !== null && deltaVal >= 0 ? "up" : deltaVal !== null ? "down" : "neutral"}
                hint={rangeDays > 1 ? `${rangeDays}j · ${fmtInt(kpi.ticket_count)} clients · ${fmtInt(kpi.receipt_count)} passages` : `${fmtInt(kpi.ticket_count)} clients · panier ${fmtTHB(kpi.avg_ticket)}`}
                icon={<TrendingUpIcon className="size-4" />}
                iconColor="var(--bronze)"
                sparkline={curveData ? <Sparkline data={curveData} color="var(--bronze)" width={64} height={20} /> : undefined}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Clients"
                value={fmtInt(kpi.ticket_count)}
                hint={`${fmtInt(kpi.receipt_count)} passages en caisse · panier ${fmtTHB(kpi.avg_ticket)}`}
                icon={<UsersIcon className="size-4" />}
                iconColor="var(--info)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Snacks"
                value={fmtTHB(snackAmount)}
                hint={`${fmtInt(kpi.snacks_sold)} snacks · ${snackPct.toFixed(0)}% des clients`}
                icon={<ShoppingBagIcon className="size-4" />}
                iconColor="var(--good)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Merch"
                value={fmtTHB(merchAmount)}
                hint={`${((merchAmount / Math.max(1, kpi.revenue_total)) * 100).toFixed(1)}% du CA · ${fmtInt(perStore.reduce((s, r) => s + r.buckets.goodies, 0) > 0 ? kpi.ticket_count : 0)} clients`}
                icon={<ShoppingBagIcon className="size-4" />}
                iconColor="var(--warn)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="TVA encaissée"
                value={fmtTHB(kpi.vat_7)}
                hint={`7% incluse · ${((kpi.vat_7 / Math.max(1, kpi.revenue_total)) * 100).toFixed(1)}% du CA`}
                icon={<ReceiptIcon className="size-4" />}
                iconColor="var(--purple)"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && rangeDays === 1 && selectedStores.length === 1 && hourlyData && hourlyData.some((h) => h.revenue > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="size-4" />
              Ventes par heure — {effectiveEnd}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyLoading ? (
              <div className="h-20 animate-pulse rounded bg-[var(--line-2)]" />
            ) : (
              <HourlyChart data={hourlyData} />
            )}
          </CardContent>
        </Card>
      )}

      {!loading && rangeDays > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>CA par jour — {rangeDays}j</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyRevenueChart
              data={(() => {
                const snaps = (data?.snapshots ?? []) as Array<{ date: string; revenue_total: number; store_id: string; account_key: string }>;
                const byDate = new Map<string, number>();
                for (const s of snaps) {
                  if (s.date < dateRange.from || s.date > dateRange.to) continue;
                  if (selectedStores.length > 0 && !selectedStores.includes(s.store_id) && !selectedStores.includes(s.account_key)) continue;
                  byDate.set(s.date, (byDate.get(s.date) ?? 0) + Number(s.revenue_total ?? 0));
                }
                return Array.from(byDate.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, revenue]) => ({ date, revenue }));
              })()}
            />
          </CardContent>
        </Card>
      )}

      {!loading && perStore.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Buckets vente</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut
                data={[
                  { label: "Drinks", value: perStore.reduce((s, r) => s + r.buckets.drinks, 0) },
                  { label: "Ticket", value: perStore.reduce((s, r) => s + r.buckets.ticket, 0) },
                  { label: "Snacks", value: perStore.reduce((s, r) => s + r.buckets.snack, 0) },
                  { label: "Goodies", value: perStore.reduce((s, r) => s + r.buckets.goodies, 0) },
                  { label: "Surcharge", value: perStore.reduce((s, r) => s + r.buckets.surcharge, 0) },
                ].filter((d) => d.value > 0)}
                colors={["var(--bronze)", "var(--info)", "var(--good)", "var(--warn)", "var(--fg-4)"]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mix paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut
                data={[
                  { label: "Cash", value: perStore.reduce((s, r) => s + r.payments.cash, 0) },
                  { label: "Scan/QR", value: perStore.reduce((s, r) => s + r.payments.scan, 0) },
                  { label: "Card", value: perStore.reduce((s, r) => s + r.payments.credit_card, 0) },
                ].filter((d) => d.value > 0)}
                colors={["var(--good)", "var(--info)", "var(--bronze)"]}
              />
              <p className="mt-2 text-center text-xs text-[var(--fg-4)]">
                Card dont {fmtTHB(perStore.reduce((s, r) => s + r.buckets.surcharge, 0))} frais (3%)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CA par boutique</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut
                data={perStore
                  .map((s) => ({ label: s.account_key, value: s.revenue_total }))
                  .sort((a, b) => b.value - a.value)}
                colors={["var(--bronze)", "var(--info)", "var(--good)", "var(--warn)", "var(--purple)", "var(--bad)", "var(--fg-4)", "var(--fg-3)"]}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && perStore.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--fg-3)]">Pas de données pour cette période.</p>
            {canSync && (
              <Button size="sm" variant="secondary" className="mt-3" onClick={handleSync} disabled={syncing}>
                Synchroniser {rangeDays > 1 ? `${rangeDays}j` : effectiveEnd}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {perStore.map((store) => {
            const failingAccount = lastRun?.per_account?.find((a) => a.account_key === store.account_key && a.error);
            const isDegraded = Boolean(failingAccount || store.unmapped.line_items > 0 || store.unmapped.payments > 0);
            const bucketEntries = [
              { label: "Drinks", value: store.buckets.drinks, color: "var(--bronze)" },
              { label: "Tickets", value: store.buckets.ticket, color: "var(--info)" },
              { label: "Snacks", value: store.buckets.snack, color: "var(--good)" },
              { label: "Goodies", value: store.buckets.goodies, color: "var(--warn)" },
            ]
              .filter((b) => b.value > 0)
              .sort((a, b) => b.value - a.value);
            const bucketMax = Math.max(...bucketEntries.map((b) => b.value), 1);
            return (
              <Card key={`${store.account_key}-${store.store_id}-${store.date}`} className={cn("overflow-hidden", isDegraded && "border-[var(--warn)]/40")}>
                <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg-2)] px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-7 items-center justify-center rounded-full bg-[var(--bronze-soft)] text-[10px] font-bold text-[var(--bronze)]">
                      {store.account_key.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold capitalize leading-none text-[var(--fg)]">{store.account_key}</p>
                    </div>
                  </div>
                  {isDegraded && (
                    <Pill tone="warn" size="sm" dot>
                      À vérifier
                    </Pill>
                  )}
                </div>

                <CardContent className="space-y-3 pt-3">
                  <div className="grid grid-cols-3 gap-2 rounded-[var(--r-sm)] bg-[var(--bg-2)] p-2">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">CA</p>
                      <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--fg)]">{fmtTHB(store.revenue_total)}</p>
                      <p className="text-[10px] text-[var(--fg-4)]">{fmtInt(store.ticket_count)} clients</p>
                    </div>
                    <div className="text-center border-x border-[var(--line)]">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Clients</p>
                      <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--fg)]">{fmtInt(store.ticket_count)}</p>
                      <p className="text-[10px] text-[var(--fg-4)]">{fmtInt(store.receipt_count)} passages</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Panier</p>
                      <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--fg)]">{fmtTHB(store.avg_ticket)}</p>
                      <p className="text-[10px] text-[var(--fg-4)]">{fmtInt(store.snacks_sold)} snacks</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Répartition ventes</p>
                    {bucketEntries.map((b) => (
                      <div key={b.label} className="flex items-center gap-2">
                        <span className="w-12 text-[11px] text-[var(--fg-3)]">{b.label}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-2)]">
                          <div className="h-full rounded-full" style={{ width: `${(b.value / bucketMax) * 100}%`, background: b.color }} />
                        </div>
                        <span className="w-16 text-right font-mono text-[11px] tabular-nums text-[var(--fg-2)]">{fmtTHB(b.value)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--good-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--good)]">
                      Cash {fmtTHB(store.payments.cash)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--info-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--info)]">
                      Scan {fmtTHB(store.payments.scan)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bronze-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--bronze)]">
                      Card {fmtTHB(store.payments.credit_card)}
                      {store.buckets.surcharge > 0 && (
                        <span className="ml-1 rounded-full bg-white/70 px-1 py-0 text-[10px] leading-none">dont {fmtTHB(store.buckets.surcharge)} frais</span>
                      )}
                    </span>
                  </div>

                  {failingAccount?.error && (
                    <p className="rounded bg-[var(--bad-soft)] px-2 py-1 text-xs text-[var(--bad)]">{failingAccount.error.slice(0, 120)}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
