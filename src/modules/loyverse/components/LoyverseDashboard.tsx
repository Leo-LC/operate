"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
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

type DashboardKpis = {
  revenue_total: number;
  vat_7: number;
  ticket_count: number;
  receipt_count: number;
  snacks_sold: number;
  store_count: number;
  avg_ticket: number;
  delta_vs_week_ago_pct: number | null;
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
  date_range: { start: string; end: string; days: number };
  kpis: DashboardKpis;
  per_store: PerStore[];
  snapshots: Array<{ date: string; revenue_total: number; account_key: string; store_id: string } & Record<string, unknown>>;
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

function BreakdownBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] font-medium text-[var(--fg-3)]">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--line-2)]">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
        </div>
      </div>
      <span className="w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--fg-2)]">{fmtTHB(value)}</span>
      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--fg-4)]">{pct.toFixed(0)}%</span>
    </div>
  );
}

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

function ShopSelector({
  locations,
  selected,
  onChange,
}: {
  locations: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const allSelected = selected.length === locations.length && locations.length > 0;
  const label = allSelected ? "Toutes boutiques" : selected.length === 0 ? "Toutes boutiques" : selected.length === 1 ? locations.find((l) => l.id === selected[0])?.name ?? "1 boutique" : `${selected.length} boutiques`;
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }
  function toggleAll() {
    onChange(allSelected ? [] : locations.map((l) => l.id));
  }
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, minWidth: 140, padding: "0 var(--s-3)", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", fontSize: 13, color: "var(--fg)", cursor: "pointer" }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
        <span style={{ fontSize: 10, color: "var(--fg-4)" }}>▼</span>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", left: 0, top: 36, zIndex: 20, minWidth: 180, borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "var(--shadow-2)", padding: "var(--s-1)", display: "flex", flexDirection: "column", gap: 2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px var(--s-3)", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <input type="checkbox" checked={allSelected || selected.length === 0} onChange={toggleAll} /> Toutes boutiques
            </label>
            <div style={{ height: 1, background: "var(--line)", margin: "2px 0" }} />
            {locations.map((loc) => (
              <label key={loc.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px var(--s-3)", borderRadius: "var(--r-sm)", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={selected.includes(loc.id) || selected.length === 0} onChange={() => toggle(loc.id)} />
                {loc.name}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: number; revenue: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1 overflow-x-auto py-2">
      {data.map((d) => (
        <div key={d.hour} className="flex flex-col items-center gap-1" style={{ minWidth: 32 }}>
          <div className="flex w-full justify-center" style={{ height: 80, alignItems: "flex-end" }}>
            <div
              style={{ width: 18, height: `${(d.revenue / max) * 80}px`, background: "var(--bronze)", borderRadius: "var(--r-sm)  var(--r-sm) 0 0", transition: "height 0.3s" }}
              title={`${d.hour}h: ${fmtTHB(d.revenue)} (${d.count} tickets)`}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]">{d.hour}h</span>
        </div>
      ))}
    </div>
  );
}

function BarChartCA({ data }: { data: { date: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1 overflow-x-auto py-2">
      {data.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1" style={{ minWidth: 36, flex: 1 }}>
          <div className="flex w-full justify-center" style={{ height: 60, alignItems: "flex-end" }}>
            <div
              style={{ width: "80%", height: `${(d.revenue / max) * 60}px`, background: "var(--bronze)", borderRadius: "var(--r-sm) var(--r-sm) 0 0" }}
              title={`${d.date}: ${fmtTHB(d.revenue)}`}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-[var(--fg-4)]">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export function LoyverseDashboard() {
  const [selectedDate, setSelectedDate] = React.useState<string>(() => bangkokToday());
  const [rangeDays, setRangeDays] = React.useState<number>(1);
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

  const fetchDashboard = React.useCallback(async (dateStr: string, days: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyverse/dashboard?date=${dateStr}&days=${days}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Dashboard fetch failed");
      setData(json as DashboardData);
      const snaps = (json.snapshots ?? []) as Array<{ date: string; revenue_total: number }>;
      const byDate = new Map<string, number>();
      for (const s of snaps) byDate.set(s.date, (byDate.get(s.date) ?? 0) + Number(s.revenue_total ?? 0));
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
    fetchDashboard(selectedDate, rangeDays);
    fetchStatus();
  }, [selectedDate, rangeDays, fetchDashboard, fetchStatus]);

  React.useEffect(() => {
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
    fetch(`/api/loyverse/hourly?date=${selectedDate}&store_id=${store.store_id}&account_key=${store.account_key}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.hourly) setHourlyData(j.hourly);
      })
      .catch(() => setHourlyData(null))
      .finally(() => setHourlyLoading(false));
  }, [selectedDate, rangeDays, selectedStores, data]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const body: Record<string, unknown> = {};
      if (rangeDays > 1) body.days = rangeDays;
      if (selectedDate !== bangkokToday() && rangeDays === 1) body.dates = [selectedDate];
      const res = await fetch("/api/loyverse/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      await Promise.all([fetchDashboard(selectedDate, rangeDays), fetchStatus()]);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  const allStores = React.useMemo(() => data?.per_store ?? [], [data?.per_store]);
  const shopLocations = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allStores) {
      const label = s.location_id ? `${s.account_key}` : `${s.account_key} (${s.store_id.slice(0, 6)})`;
      map.set(s.store_id, label);
    }
    for (const a of status?.accounts ?? []) {
      const hasStore = Array.from(map.keys()).some((k) => k === a.key || map.get(k)?.startsWith(a.key));
      if (!hasStore) map.set(a.key, a.label);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allStores, status]);

  const perStore = React.useMemo(() => {
    if (selectedStores.length === 0) return allStores;
    return allStores.filter((s) => selectedStores.includes(s.store_id) || selectedStores.includes(s.account_key));
  }, [selectedStores, allStores]);

  const filteredKpis = React.useMemo(() => {
    const kpis = data?.kpis ?? null;
    if (selectedStores.length === 0 || !data) return kpis;
    const rev = perStore.reduce((s, r) => s + r.revenue_total, 0);
    return kpis
      ? {
          ...kpis,
          revenue_total: rev,
          store_count: perStore.length,
          ticket_count: perStore.reduce((s, r) => s + r.ticket_count, 0),
          receipt_count: perStore.reduce((s, r) => s + r.receipt_count, 0),
          snacks_sold: perStore.reduce((s, r) => s + r.snacks_sold, 0),
          avg_ticket: perStore.length ? rev / Math.max(1, perStore.reduce((s, r) => s + r.ticket_count, 0)) : 0,
        }
      : kpis;
  }, [selectedStores, perStore, data]);

  const dateRangeValue = React.useMemo(() => {
    const from = selectedDate;
    const toDate = new Date(selectedDate);
    toDate.setDate(toDate.getDate() + rangeDays - 1);
    const to = toDate.toISOString().slice(0, 10);
    return { from, to };
  }, [selectedDate, rangeDays]);

  if (status && !status.configured) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Loyverse" subtitle="Daily sales from POS — read-only" eyebrow="Operations" />
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
  const totalBuckets = perStore.reduce(
    (acc, s) => ({
      drinks: acc.drinks + s.buckets.drinks,
      ticket: acc.ticket + s.buckets.ticket,
      snack: acc.snack + s.buckets.snack,
      goodies: acc.goodies + s.buckets.goodies,
      surcharge: acc.surcharge + s.buckets.surcharge,
    }),
    { drinks: 0, ticket: 0, snack: 0, goodies: 0, surcharge: 0 },
  );
  const bucketsTotal = totalBuckets.drinks + totalBuckets.ticket + totalBuckets.snack + totalBuckets.goodies + totalBuckets.surcharge;
  const totalPayments = perStore.reduce(
    (acc, s) => ({
      cash: acc.cash + s.payments.cash,
      scan: acc.scan + s.payments.scan,
      credit_card: acc.credit_card + s.payments.credit_card,
    }),
    { cash: 0, scan: 0, credit_card: 0 },
  );
  const paymentsTotal = totalPayments.cash + totalPayments.scan + totalPayments.credit_card;
  const hasSyncErrors = Boolean(lastRun?.per_account?.some((a) => a.error) || lastRun?.error);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loyverse"
        subtitle="Synchroniser charge les ventes (30j initial puis incrémental) ; date/boutique affichent la période déjà chargée."
        eyebrow="Operations"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] p-1">
              <button onClick={() => setRangeDays(1)} className={cn("rounded px-2 py-1 text-xs font-medium", rangeDays === 1 ? "bg-[var(--fg)] text-white" : "text-[var(--fg-3)]")}>Jour</button>
              <button onClick={() => setRangeDays(7)} className={cn("rounded px-2 py-1 text-xs font-medium", rangeDays === 7 ? "bg-[var(--fg)] text-white" : "text-[var(--fg-3)]")}>7j</button>
              <button onClick={() => setRangeDays(30)} className={cn("rounded px-2 py-1 text-xs font-medium", rangeDays === 30 ? "bg-[var(--fg)] text-white" : "text-[var(--fg-3)]")}>30j</button>
            </div>
            <DateRangePicker
              value={dateRangeValue}
              onChange={(range) => {
                setSelectedDate(range.from);
                const d1 = new Date(range.from);
                const d2 = new Date(range.to);
                const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
                setRangeDays(diff);
              }}
              today={bangkokToday()}
            />
            <ShopSelector
              locations={shopLocations}
              selected={selectedStores}
              onChange={setSelectedStores}
            />
            <Button onClick={handleSync} disabled={syncing} size="default" title="Charge les ventes depuis Loyverse (incrémental, 30j au premier sync)">
              <RefreshCwIcon className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? "Sync…" : "Synchroniser"}
            </Button>
          </div>
        }
      />

      {lastRun && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Pill tone={hasSyncErrors ? "warn" : lastRun.status === "completed" ? "good" : "neutral"} dot size="sm">
            {lastRun.status} · {lastRun.triggered_by} · {lastRun.finished_at ? new Date(lastRun.finished_at).toLocaleString("fr-FR") : "en cours"}
          </Pill>
          <span className="text-[var(--fg-4)]">
            {status?.snapshot_count ?? 0} snapshots · {status?.account_count ?? 0} comptes · affiché {selectedStores.length === 0 ? "tout" : `${selectedStores.length} filtrés`} · {rangeDays}j
          </span>
          {hasSyncErrors && <span className="text-[var(--warn)]">Certains comptes ont échoué — voir détails par shop</span>}
        </div>
      )}
      {syncError && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{syncError}</div>}
      {error && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 w-20 rounded bg-[var(--line-2)]" />
                <div className="mt-3 h-6 w-24 rounded bg-[var(--line)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredKpis ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent>
              <Stat
                label="CA"
                value={fmtTHB(filteredKpis.revenue_total)}
                delta={fmtDelta(filteredKpis.delta_vs_week_ago_pct) ?? undefined}
                deltaDir={filteredKpis.delta_vs_week_ago_pct !== null && filteredKpis.delta_vs_week_ago_pct >= 0 ? "up" : filteredKpis.delta_vs_week_ago_pct !== null ? "down" : "neutral"}
                hint={`${rangeDays > 1 ? `${rangeDays}j cumulé` : fmtInt(filteredKpis.receipt_count) + " tickets"} · HT ${fmtTHB(Math.max(0, filteredKpis.revenue_total - filteredKpis.vat_7))}`}
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
                value={fmtInt(filteredKpis.ticket_count)}
                hint={`Billets vendus (cat. Tickets) · ${fmtInt(filteredKpis.receipt_count)} reçus`}
                icon={<UsersIcon className="size-4" />}
                iconColor="var(--info)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="TVA 7%"
                value={fmtTHB(filteredKpis.vat_7)}
                hint={`${((filteredKpis.vat_7 / Math.max(1, filteredKpis.revenue_total)) * 100).toFixed(1)}% du CA`}
                icon={<ReceiptIcon className="size-4" />}
                iconColor="var(--warn)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="CB encaissé"
                value={fmtTHB(perStore.reduce((s, r) => s + r.payments.credit_card, 0))}
                hint={`dont ${fmtTHB(perStore.reduce((s, r) => s + r.buckets.surcharge, 0))} frais bancaires (3%)`}
                icon={<ShoppingBagIcon className="size-4" />}
                iconColor="var(--good)"
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
              Ventes par heure — {selectedDate}
            </CardTitle>
            <p className="text-xs text-[var(--fg-4)]">Comme le backoffice Loyverse (heure Bangkok)</p>
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

      {!loading && rangeDays > 1 && curveData && curveData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>CA par jour — {rangeDays} jours cumulés {fmtTHB(filteredKpis?.revenue_total ?? 0)}</CardTitle>
            <p className="text-xs text-[var(--fg-4)]">Chaque barre = 1 jour</p>
          </CardHeader>
          <CardContent>
            <BarChartCA data={(() => {
              const snaps = (data?.snapshots ?? []) as Array<{ date: string; revenue_total: number; store_id: string; account_key: string }>;
              const byDate = new Map<string, number>();
              for (const s of snaps) {
                if (selectedStores.length > 0 && !selectedStores.includes(s.store_id) && !selectedStores.includes(s.account_key)) continue;
                byDate.set(s.date, (byDate.get(s.date) ?? 0) + Number(s.revenue_total ?? 0));
              }
              return Array.from(byDate.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([date,revenue])=>({date,revenue}));
            })()} />
          </CardContent>
        </Card>
      )}

      {!loading && perStore.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--fg-3)]">Pas de données pour {selectedDate} ({rangeDays}j) {selectedStores.length > 0 ? "— shop filtré a 0 snapshot" : ""}.</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Clique <strong>Synchroniser</strong> pour charger cette période.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={handleSync} disabled={syncing}>
              Synchroniser {rangeDays > 1 ? `${rangeDays}j` : selectedDate}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {perStore.map((store) => {
            const failingAccount = lastRun?.per_account?.find((a) => a.account_key === store.account_key && a.error);
            const isDegraded = Boolean(failingAccount || store.unmapped.line_items > 0 || store.unmapped.payments > 0);
            const bucketMax = Math.max(store.buckets.drinks, store.buckets.ticket, store.buckets.snack, store.buckets.goodies, store.buckets.surcharge, 1);
            return (
              <Card
                key={`${store.account_key}-${store.store_id}-${store.date}`}
                className={cn("overflow-hidden", isDegraded && "border-[var(--warn)]/40")}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg-2)] px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-7 items-center justify-center rounded-full bg-[var(--bronze-soft)] text-[10px] font-bold text-[var(--bronze)]">
                      {store.account_key.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--fg)]">{store.account_key}</p>
                      <p className="truncate text-[11px] text-[var(--fg-4)]">{store.store_id.slice(0, 8)} · {store.location_id ? "mappé" : "non mappé"}</p>
                    </div>
                  </div>
                  <Pill tone={isDegraded ? "warn" : "good"} size="sm" dot>
                    {isDegraded ? "À vérifier" : "OK"}
                  </Pill>
                </div>

                <CardContent className="space-y-3 pt-3">
                  <div className="grid grid-cols-3 gap-2 rounded-[var(--r-sm)] bg-[var(--bg-2)] p-2">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">CA</p>
                      <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--fg)]">{fmtTHB(store.revenue_total)}</p>
                      <p className="text-[10px] text-[var(--fg-4)]">{fmtInt(store.receipt_count)} tickets</p>
                    </div>
                    <div className="text-center border-x border-[var(--line)]">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Clients</p>
                      <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--fg)]">{fmtInt(store.ticket_count)}</p>
                      <p className="text-[10px] text-[var(--fg-4)]">{fmtInt(store.snacks_sold)} snacks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Panier</p>
                      <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--fg)]">{fmtTHB(store.avg_ticket)}</p>
                      <p className="text-[10px] text-[var(--fg-4)]">TVA {fmtTHB(store.buckets.surcharge > 0 ? store.revenue_total * 0.07 : 0)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Répartition ventes</p>
                    {[
                      { label: "Drinks", value: store.buckets.drinks, color: "var(--bronze)" },
                      { label: "Tickets", value: store.buckets.ticket, color: "var(--info)" },
                      { label: "Snacks", value: store.buckets.snack, color: "var(--good)" },
                      { label: "Goodies", value: store.buckets.goodies, color: "var(--warn)" },
                    ]
                      .filter((b) => b.value > 0)
                      .map((b) => (
                        <div key={b.label} className="flex items-center gap-2">
                          <span className="w-12 text-[11px] text-[var(--fg-3)]">{b.label}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-2)]">
                            <div className="h-full rounded-full" style={{ width: `${(b.value / bucketMax) * 100}%`, background: b.color }} />
                          </div>
                          <span className="w-16 text-right font-mono text-[11px] tabular-nums text-[var(--fg-2)]">{fmtTHB(b.value)}</span>
                        </div>
                      ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--good-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--good)]">
                      Cash {fmtTHB(store.payments.cash)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--info)]">
                      Scan {fmtTHB(store.payments.scan)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bronze-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--bronze)]">
                      Card {fmtTHB(store.payments.credit_card)}
                      {store.buckets.surcharge > 0 && (
                        <span className="ml-1 rounded-full bg-white/70 px-1 py-0 text-[10px] leading-none">+{fmtTHB(store.buckets.surcharge)} frais</span>
                      )}
                    </span>
                  </div>

                  {(store.unmapped.line_items > 0 || store.unmapped.payments > 0) && (
                    <p className="rounded bg-[var(--warn-soft)] px-2 py-1 text-xs text-[var(--warn)]">
                      Non mappé: {store.unmapped.line_items} lignes · {store.unmapped.payments} paiements → onglet Unmapped
                    </p>
                  )}
                  {failingAccount?.error && (
                    <p className="rounded bg-[var(--bad-soft)] px-2 py-1 text-xs text-[var(--bad)]">{failingAccount.error.slice(0, 120)}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && perStore.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Buckets vente</CardTitle>
              <p className="text-xs text-[var(--fg-4)]">{selectedDate} · total {fmtTHB(perStore.reduce((s, r) => s + r.buckets.drinks + r.buckets.ticket + r.buckets.snack + r.buckets.goodies + r.buckets.surcharge, 0))} {selectedStores.length > 0 ? "(filtré)" : ""}</p>
            </CardHeader>
            <CardContent className="space-y-3">
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
              <p className="text-xs text-[var(--fg-4)]">{selectedDate} · total {fmtTHB(perStore.reduce((s, r) => s + r.payments.cash + r.payments.scan + r.payments.credit_card, 0))} {selectedStores.length > 0 ? "(filtré)" : ""}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Donut
                data={[
                  { label: "Cash", value: perStore.reduce((s, r) => s + r.payments.cash, 0) },
                  { label: "Scan/QR", value: perStore.reduce((s, r) => s + r.payments.scan, 0) },
                  { label: "Card", value: perStore.reduce((s, r) => s + r.payments.credit_card, 0) },
                ].filter((d) => d.value > 0)}
                colors={["var(--good)", "var(--info)", "var(--bronze)"]}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
