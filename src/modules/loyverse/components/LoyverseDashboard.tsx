"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { PillButton } from "@/components/ui/pill-button";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { RefreshCwIcon, TrendingUpIcon, ShoppingBagIcon, UsersIcon, ClockIcon, ReceiptIcon } from "lucide-react";
import { DateRangePicker } from "@/modules/reports/components/DateRangePicker";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function fmtTHB(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
}
function fmtInt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
function fmtDelta(pct: number | null) {
  if (pct === null || !Number.isFinite(pct)) return null;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
import { bangkokToday, parseDay, capitalizeShop } from "@/lib/loyverse/dates";

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

function Donut({ data, colors }: { data: { label: string; value: number; sublabel?: string }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="py-6 text-center text-sm text-[var(--fg-4)]">No data</div>;
  let acc = 0;
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
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
    return (
      <path
        key={d.label}
        d={dAttr}
        fill={colors[i % colors.length]}
        style={{ opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.45, transition: "opacity 150ms ease", cursor: "pointer" }}
        onMouseEnter={() => setHoverIdx(i)}
        onMouseLeave={() => setHoverIdx(null)}
      />
    );
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={80} height={80} viewBox="0 0 80 80" className="shrink-0">
        <circle cx={40} cy={40} r={36} fill="var(--line-2)" />
        {segments}
        <circle cx={40} cy={40} r={18} fill="var(--surface)" />
      </svg>
      <div className="flex flex-1 flex-col gap-1.5 text-xs">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex flex-col gap-0 rounded px-1 py-0.5 transition-colors"
            style={{ background: hoverIdx === i ? "var(--line-2)" : "transparent" }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <div className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colors[i % colors.length] }} />
              <span className="text-[var(--fg-3)]">{d.label}</span>
              <span className="ml-auto font-mono tabular-nums text-[var(--fg-2)]">{fmtTHB(d.value)}</span>
            </div>
            {d.sublabel && <span className="ml-[18px] text-[10px] leading-none text-[var(--fg-4)]">{d.sublabel}</span>}
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
          <PillButton key={loc.id} active={active} onClick={() => toggle(loc.id)} style={{ textTransform: "capitalize" }}>
            {capitalizeShop(loc.name)}
          </PillButton>
        );
      })}
    </div>
  );
}

function HourlyBarChart({ data }: { data: { hour: number; revenue: number; count: number }[] }) {
  const filtered = data.filter((d) => d.hour >= 9 && d.hour <= 21);
  const display = filtered.length ? filtered : data;
  const chartData = display.map((d) => ({ hour: `${d.hour}h`, revenue: d.revenue, count: d.count }));
  return (
    <div className="h-[220px] w-full outline-none [&:focus]:outline-none [&_*:focus]:outline-none" tabIndex={-1} style={{ outline: "none" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-2)" vertical={false} />
          <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--fg-4)" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => fmtTHB(v as number)} tick={{ fontSize: 10, fill: "var(--fg-4)" }} axisLine={false} tickLine={false} width={72} />
          <Tooltip
            cursor={{ fill: "var(--line-2)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload as { hour: string; revenue: number; count: number };
              return (
                <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 shadow-md">
                  <div className="text-xs font-medium text-[var(--fg)]">{p.hour}</div>
                  <div className="font-mono text-xs tabular-nums text-[var(--bronze)]">{fmtTHB(p.revenue)}</div>
                  <div className="text-[11px] text-[var(--fg-4)]">{p.count} receipts</div>
                </div>
              );
            }}
          />
          <Bar dataKey="revenue" fill="var(--bronze)" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DailyBarChart({ data, onSelectDate }: { data: { date: string; revenue: number }[]; onSelectDate?: (date: string) => void }) {
  if (data.length === 0) return <div className="py-6 text-center text-sm text-[var(--fg-4)]">No data</div>;
  const chartData = data.map((d) => ({ date: d.date.slice(5), fullDate: d.date, revenue: d.revenue }));
  return (
    <div className="h-[240px] w-full outline-none [&:focus]:outline-none [&_*:focus]:outline-none" tabIndex={-1} style={{ outline: "none" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap={chartData.length < 10 ? "22%" : "14%"}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-2)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--fg-4)" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => fmtTHB(v as number)} tick={{ fontSize: 10, fill: "var(--fg-4)" }} axisLine={false} tickLine={false} width={72} />
          <Tooltip
            cursor={{ fill: "var(--line-2)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload as { fullDate: string; revenue: number };
              return (
                <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 shadow-md">
                  <div className="text-xs font-medium text-[var(--fg)]">{p.fullDate}</div>
                  <div className="font-mono text-xs tabular-nums text-[var(--bronze)]">{fmtTHB(p.revenue)}</div>
                  {onSelectDate && <div className="text-[10px] text-[var(--fg-4)]">Click to view day</div>}
                </div>
              );
            }}
          />
          <Bar
            dataKey="revenue"
            fill="var(--bronze)"
            radius={[6, 6, 0, 0]}
            maxBarSize={56}
            barSize={undefined}
            cursor={onSelectDate ? "pointer" : undefined}
            onClick={(entry) => {
              const d = (entry as unknown as { fullDate?: string })?.fullDate ?? (entry as unknown as { payload?: { fullDate?: string } })?.payload?.fullDate;
              if (d && onSelectDate) onSelectDate(d);
            }}
            style={{ outline: "none" } as React.CSSProperties}
          />
        </BarChart>
      </ResponsiveContainer>
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
    if (rangeDays !== 1 || !data?.per_store.length) {
      setHourlyData(null);
      return;
    }
    const allStoresRaw = data.per_store;
    const storesToFetch = selectedStores.length === 0 ? allStoresRaw : allStoresRaw.filter((s) => selectedStores.includes(s.store_id) || selectedStores.includes(s.account_key));
    if (storesToFetch.length === 0) {
      setHourlyData(null);
      return;
    }
    setHourlyLoading(true);
    Promise.all(
      storesToFetch.map((store) =>
        fetch(`/api/loyverse/hourly?date=${effectiveEnd}&store_id=${store.store_id}&account_key=${store.account_key}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((j) => (j.hourly as { hour: number; revenue: number; count: number }[] | undefined) ?? [])
          .catch(() => [] as { hour: number; revenue: number; count: number }[])
      )
    )
      .then((results) => {
        const merged = new Map<number, { revenue: number; count: number }>();
        for (let h = 9; h <= 21; h++) merged.set(h, { revenue: 0, count: 0 });
        for (const arr of results) {
          for (const entry of arr) {
            const cur = merged.get(entry.hour);
            if (cur) {
              cur.revenue += entry.revenue;
              cur.count += entry.count;
            } else {
              merged.set(entry.hour, { revenue: entry.revenue, count: entry.count });
            }
          }
        }
        const hourly = Array.from(merged.entries())
          .sort(([a], [b]) => a - b)
          .map(([hour, v]) => ({ hour, revenue: v.revenue, count: v.count }));
        const hasData = hourly.some((h) => h.revenue > 0);
        setHourlyData(hasData ? hourly : hourly);
      })
      .finally(() => setHourlyLoading(false));
  }, [effectiveEnd, rangeDays, selectedStores, data]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const body: Record<string, unknown> = {};
      if (rangeDays > 1) body.days = rangeDays;
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
    const rev = perStore.reduce((s, r) => s + r.revenue_total, 0);
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
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--fg-3)]">Loyverse is not configured.</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Add LOYVERSE_ACCOUNTS in Vercel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lastRun = status?.last_run;
  const kpi = filteredKpis;
  const snackAmount = perStore.reduce((s, r) => s + r.buckets.snack, 0);
  const snackPct = kpi && kpi.ticket_count > 0 ? (kpi.snacks_sold / kpi.ticket_count) * 100 : 0;
  const merchAmount = perStore.reduce((s, r) => s + r.buckets.goodies, 0);

  const dailyChartData = (() => {
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
  })();

  const toggleShop = (store: PerStore) => {
    const isSelected = selectedStores.includes(store.store_id) || selectedStores.includes(store.account_key);
    if (isSelected) {
      setSelectedStores((prev) => prev.filter((id) => id !== store.store_id && id !== store.account_key));
    } else {
      // single select behavior like pills: if All selected, switch to single; if some selected, add
      if (selectedStores.length === 0) setSelectedStores([store.store_id]);
      else setSelectedStores([...selectedStores, store.store_id]);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={(range) => setDateRange(range)} today={bangkokToday()} />
          <div className="ml-auto flex items-center gap-2">
            {lastRun?.finished_at && (
              <span className="hidden text-xs text-[var(--fg-4)] sm:inline">
                {lastRun.status === "completed" ? "✓" : "●"} {new Date(lastRun.finished_at).toLocaleDateString("en-GB")} {new Date(lastRun.finished_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {canSync && (
              <Button onClick={handleSync} disabled={syncing} size="default">
                <RefreshCwIcon className={cn("size-3.5", syncing && "animate-spin")} />
                {syncing ? "Syncing…" : "Sync"}
              </Button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Card className="flex flex-col">
            <CardContent className="flex flex-1 flex-col">
              <Stat
                label="Revenue"
                value={fmtTHB(kpi.revenue_total)}
                hint={`${fmtInt(kpi.ticket_count)} customers`}
                icon={<TrendingUpIcon className="size-4" />}
                iconColor="var(--bronze)"
              />
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardContent className="flex flex-1 flex-col">
              <Stat
                label="Customers"
                value={fmtInt(kpi.ticket_count)}
                icon={<UsersIcon className="size-4" />}
                iconColor="var(--info)"
              />
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardContent className="flex flex-1 flex-col">
              <Stat
                label="Animal Food"
                value={fmtTHB(snackAmount)}
                hint={`${fmtInt(kpi.snacks_sold)} snacks · ${snackPct.toFixed(0)}% of customers`}
                icon={<ShoppingBagIcon className="size-4" />}
                iconColor="var(--good)"
              />
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardContent className="flex flex-1 flex-col">
              <Stat
                label="Merch"
                value={fmtTHB(merchAmount)}
                hint={`${((merchAmount / Math.max(1, kpi.revenue_total)) * 100).toFixed(1)}% of revenue`}
                icon={<ShoppingBagIcon className="size-4" />}
                iconColor="var(--warn)"
              />
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardContent className="flex flex-1 flex-col">
              <Stat
                label="VAT collected"
                value={fmtTHB(kpi.vat_7)}
                hint={`${((kpi.vat_7 / Math.max(1, kpi.revenue_total)) * 100).toFixed(1)}% of revenue`}
                icon={<ReceiptIcon className="size-4" />}
                iconColor="var(--purple)"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && rangeDays === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="size-4" />
              Hourly sales — {effectiveEnd} {selectedStores.length === 0 ? "(all shops)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyLoading ? (
              <div className="h-[220px] animate-pulse rounded bg-[var(--line-2)]" />
            ) : hourlyData && hourlyData.some((h) => h.revenue > 0) ? (
              <HourlyBarChart data={hourlyData} />
            ) : (
              <div className="py-8 text-center text-sm text-[var(--fg-4)]">No hourly data</div>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && rangeDays > 1 && (
        <Card className="outline-none focus:outline-none focus-visible:outline-none [&:focus]:outline-none" tabIndex={-1} style={{ outline: "none" }}>
          <CardHeader>
            <CardTitle>Revenue per day — {rangeDays}d</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyBarChart data={dailyChartData} onSelectDate={(d) => setDateRange({ from: d, to: d })} />
          </CardContent>
        </Card>
      )}

      {!loading && perStore.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Sales buckets</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut
                data={[
                  { label: "Drinks", value: perStore.reduce((s, r) => s + r.buckets.drinks, 0) },
                  { label: "Ticket", value: perStore.reduce((s, r) => s + r.buckets.ticket, 0) },
                  { label: "Animal Food", value: perStore.reduce((s, r) => s + r.buckets.snack, 0) },
                  { label: "Goodies", value: perStore.reduce((s, r) => s + r.buckets.goodies, 0) },
                  { label: "Surcharge", value: perStore.reduce((s, r) => s + r.buckets.surcharge, 0) },
                ].filter((d) => d.value > 0)}
                colors={["var(--chart-1)", "var(--purple)", "var(--good)", "var(--amber)", "var(--fg-4)"]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment mix</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const surcharge = perStore.reduce((s, r) => s + r.buckets.surcharge, 0);
                return (
                  <Donut
                    data={[
                      { label: "Cash", value: perStore.reduce((s, r) => s + r.payments.cash, 0) },
                      { label: "Scan/QR", value: perStore.reduce((s, r) => s + r.payments.scan, 0) },
                      {
                        label: "Card",
                        value: perStore.reduce((s, r) => s + r.payments.credit_card, 0),
                        sublabel: surcharge > 0 ? `incl. ${fmtTHB(surcharge)} fees` : undefined,
                      },
                    ].filter((d) => d.value > 0)}
                    colors={["var(--good)", "var(--amber)", "var(--chart-1)"]}
                  />
                );
              })()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue by shop</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut
                data={perStore
                  .map((s) => ({ label: capitalizeShop(s.account_key), value: s.revenue_total }))
                  .sort((a, b) => b.value - a.value)}
                colors={["var(--chart-1)", "var(--purple)", "var(--good)", "var(--amber)", "var(--bad)", "var(--chart-7)", "var(--chart-8)", "var(--fg-4)"]}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && perStore.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--fg-3)]">No data for this period.</p>
            {canSync && (
              <Button size="sm" variant="secondary" className="mt-3" onClick={handleSync} disabled={syncing}>
                Sync {rangeDays > 1 ? `${rangeDays}d` : effectiveEnd}
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
              { label: "Drinks", value: store.buckets.drinks, color: "var(--chart-1)" },
              { label: "Tickets", value: store.buckets.ticket, color: "var(--purple)" },
              { label: "Animal Food", value: store.buckets.snack, color: "var(--good)" },
              { label: "Goodies", value: store.buckets.goodies, color: "var(--amber)" },
            ]
              .filter((b) => b.value > 0)
              .sort((a, b) => b.value - a.value);
            const bucketMax = Math.max(...bucketEntries.map((b) => b.value), 1);
            const isSelected = selectedStores.includes(store.store_id) || selectedStores.includes(store.account_key);
            const checkReason = (() => {
              if (failingAccount?.error) return failingAccount.error;
              if (store.unmapped.line_items > 0 || store.unmapped.payments > 0) return `Unmapped: ${store.unmapped.line_items} items · ${store.unmapped.payments} payments`;
              return "Data needs review";
            })();
            return (
              <Card
                key={`${store.account_key}-${store.store_id}-${store.date}`}
                flush
                onClick={() => toggleShop(store)}
                className={cn(
                  "group cursor-pointer overflow-hidden p-0 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]",
                  isDegraded && "border-[var(--warn)]/40",
                  isSelected && "ring-2 ring-[var(--bronze)] ring-offset-0 border-[var(--bronze)]"
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold leading-none text-[var(--fg)]" style={{ textTransform: "capitalize" }}>{store.account_key}</p>
                  </div>
                  {isDegraded && (
                    <span title={checkReason} className="inline-flex">
                      <Pill tone="warn" size="sm" dot className="cursor-help" title={checkReason}>
                        Check
                      </Pill>
                    </span>
                  )}
                </div>

                <CardContent className="space-y-3 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-2 gap-0 divide-x divide-[var(--line)] border-b border-[var(--line)]">
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Revenue</p>
                      <p className="font-mono text-[13px] font-semibold tabular-nums text-[var(--fg)]">{fmtTHB(store.revenue_total)}</p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Merch</p>
                      <p className="font-mono text-[13px] font-semibold tabular-nums text-[var(--fg)]">{fmtTHB(store.buckets.goodies)}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 px-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Sales breakdown</p>
                    {bucketEntries.map((b) => (
                      <div key={b.label} className="flex items-center gap-2">
                        <span className="w-[72px] shrink-0 text-[11px] text-[var(--fg-3)]">{b.label}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-2)]">
                          <div className="h-full rounded-full" style={{ width: `${(b.value / bucketMax) * 100}%`, background: b.color }} />
                        </div>
                        <span className="w-[72px] shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--fg-2)]">{fmtTHB(b.value)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="divide-y divide-[var(--line)] border-t border-[var(--line)] px-1">
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-[var(--fg-4)]">Cash</span>
                      <span className="font-mono text-[12px] font-medium tabular-nums text-[var(--fg-2)]">{fmtTHB(store.payments.cash)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-[var(--fg-4)]">Scan</span>
                      <span className="font-mono text-[12px] font-medium tabular-nums text-[var(--fg-2)]">{fmtTHB(store.payments.scan)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-[var(--fg-4)]">Card</span>
                      <span className="font-mono text-[12px] font-medium tabular-nums text-[var(--fg-2)]">
                        {fmtTHB(store.payments.credit_card)}
                        {store.buckets.surcharge > 0 && (
                          <span className="ml-2 text-[10px] text-[var(--fg-4)]">incl. {fmtTHB(store.buckets.surcharge)} fees</span>
                        )}
                      </span>
                    </div>
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
