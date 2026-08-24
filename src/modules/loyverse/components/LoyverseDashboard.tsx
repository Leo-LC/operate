"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { RefreshCwIcon, StoreIcon, TrendingUpIcon, ShoppingBagIcon, UsersIcon, CalendarRangeIcon } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";

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

export function LoyverseDashboard() {
  const [selectedDate, setSelectedDate] = React.useState<string>(() => bangkokToday());
  const [rangeDays, setRangeDays] = React.useState<number>(1);
  const [selectedStore, setSelectedStore] = React.useState<string>("all");
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [status, setStatus] = React.useState<StatusData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const [curveData, setCurveData] = React.useState<number[] | null>(null);

  const fetchDashboard = React.useCallback(async (dateStr: string, days: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyverse/dashboard?date=${dateStr}&days=${days}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Dashboard fetch failed");
      setData(json as DashboardData);
      // Build 7-day curve from snapshots if available (group by date)
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

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      // Clarification: sync charge (load) les données, l'affichage est piloté par date/shop ci-dessus
      const body: Record<string, unknown> = {};
      if (rangeDays > 1) body.days = rangeDays;
      // If custom date not today, sync that specific date range
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

  const kpis = data?.kpis;
  const allStores = React.useMemo(() => data?.per_store ?? [], [data?.per_store]);
  const perStore = React.useMemo(
    () => (selectedStore === "all" ? allStores : allStores.filter((s) => s.store_id === selectedStore || s.account_key === selectedStore)),
    [selectedStore, allStores],
  );
  // Recompute KPIs for filtered store (if filtered)
  const filteredKpis = React.useMemo(() => {
    if (selectedStore === "all" || !data) return kpis;
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
  }, [selectedStore, perStore, kpis, data]);

  const storeOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allStores) map.set(s.store_id, `${s.account_key} — ${s.store_id.slice(0, 8)}`);
    for (const a of status?.accounts ?? []) if (!Array.from(map.values()).some((v) => v.startsWith(a.key))) map.set(a.key, a.label);
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [allStores, status]);

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
        subtitle="Synchroniser charge les ventes ; le sélecteur date/boutique affiche la période choisie. Aucune écriture dans daily_entries."
        eyebrow="Operations"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] p-1">
              <button onClick={() => setRangeDays(1)} className={cn("rounded px-2 py-1 text-xs font-medium", rangeDays === 1 ? "bg-[var(--fg)] text-white" : "text-[var(--fg-3)]")}>Jour</button>
              <button onClick={() => setRangeDays(7)} className={cn("rounded px-2 py-1 text-xs font-medium", rangeDays === 7 ? "bg-[var(--fg)] text-white" : "text-[var(--fg-3)]")}>7j</button>
              <button onClick={() => setRangeDays(30)} className={cn("rounded px-2 py-1 text-xs font-medium", rangeDays === 30 ? "bg-[var(--fg)] text-white" : "text-[var(--fg-3)]")}>30j</button>
            </div>
            <label className="flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--fg-3)]">
              <CalendarRangeIcon className="size-3.5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-[13px] font-medium text-[var(--fg)] outline-none"
              />
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="h-[34px] rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--fg)]"
            >
              <option value="all">Toutes boutiques ({allStores.length})</option>
              {storeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <Button onClick={handleSync} disabled={syncing} size="default" title="Charge les ventes depuis Loyverse (J/J-1 ou période affichée)">
              <RefreshCwIcon className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? "Sync…" : rangeDays > 1 ? `Synchroniser ${rangeDays}j` : "Synchroniser"}
            </Button>
          </div>
        }
      />

      {/* Status bar */}
      {lastRun && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Pill tone={hasSyncErrors ? "warn" : lastRun.status === "completed" ? "good" : "neutral"} dot size="sm">
            {lastRun.status} · {lastRun.triggered_by} · {lastRun.finished_at ? new Date(lastRun.finished_at).toLocaleString("fr-FR") : "en cours"}
          </Pill>
          <span className="text-[var(--fg-4)]">
            {status?.snapshot_count ?? 0} snapshots · {status?.account_count ?? 0} comptes · affiché {selectedStore === "all" ? "tout" : "filtré"} · {rangeDays}j
          </span>
          {hasSyncErrors && <span className="text-[var(--warn)]">Certains comptes ont échoué — voir détails par shop</span>}
        </div>
      )}
      {syncError && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{syncError}</div>}
      {error && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

      {/* KPIs — CA + Clients (tickets) + Snacks + Boutiques (panier en hint) */}
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
                label="CA du jour"
                value={fmtTHB(filteredKpis.revenue_total)}
                delta={fmtDelta(filteredKpis.delta_vs_week_ago_pct) ?? undefined}
                deltaDir={filteredKpis.delta_vs_week_ago_pct !== null && filteredKpis.delta_vs_week_ago_pct >= 0 ? "up" : filteredKpis.delta_vs_week_ago_pct !== null ? "down" : "neutral"}
                hint={`${fmtInt(filteredKpis.receipt_count)} tickets · HT ${fmtTHB(Math.max(0, filteredKpis.revenue_total - filteredKpis.vat_7))}`}
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
                hint={`${fmtInt(filteredKpis.receipt_count)} reçus · ${fmtInt(filteredKpis.snacks_sold)} snacks`}
                icon={<UsersIcon className="size-4" />}
                iconColor="var(--info)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Snacks"
                value={fmtInt(filteredKpis.snacks_sold)}
                hint={`Panier ${fmtTHB(filteredKpis.avg_ticket)} · TVA ${fmtTHB(filteredKpis.vat_7)}`}
                icon={<ShoppingBagIcon className="size-4" />}
                iconColor="var(--good)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Boutiques"
                value={`${perStore.length}`}
                hint={`${status?.account_count ?? 0} comptes · ${rangeDays}j`}
                icon={<StoreIcon className="size-4" />}
                iconColor="var(--warn)"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Courbe 7/30j */}
      {!loading && curveData && curveData.length > 1 && rangeDays > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Évolution CA — {rangeDays} jours</CardTitle>
            <p className="text-xs text-[var(--fg-4)]">Chaque point = 1 jour (Bangkok)</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <Sparkline data={curveData} color="var(--bronze)" width={600} height={48} />
              <span className="text-xs text-[var(--fg-4)]">{fmtTHB(Math.max(...curveData))} max</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-shop grid */}
      {!loading && perStore.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--fg-3)]">Pas de données pour {selectedDate} ({rangeDays}j) {selectedStore !== "all" ? "— ce shop a 0 snapshot" : ""}.</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Clique <strong>Synchroniser</strong> pour charger cette période, puis le sélecteur date/shop n’affiche que ce qui est déjà chargé.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={handleSync} disabled={syncing}>
              Synchroniser {rangeDays > 1 ? `${rangeDays}j` : selectedDate}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {perStore.map((store) => {
            const failingAccount = lastRun?.per_account?.find((a) => a.account_key === store.account_key && a.error);
            const isDegraded = Boolean(failingAccount || store.unmapped.line_items > 0 || store.unmapped.payments > 0);
            return (
              <Card
                key={`${store.account_key}-${store.store_id}-${store.date}`}
                className={cn(isDegraded && "border-[var(--warn)]/40")}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-[14px]">{store.store_id.slice(0, 8)} · {store.account_key}</CardTitle>
                      <p className="mt-0.5 text-xs text-[var(--fg-4)]">
                        {store.location_id ? `mappé · ${store.location_id.slice(0, 8)}` : "non mappé"}
                        {rangeDays > 1 ? ` · ${store.date}` : ""}
                      </p>
                    </div>
                    <Pill tone={isDegraded ? "warn" : "good"} size="sm" dot>
                      {isDegraded ? "À vérifier" : "OK"}
                    </Pill>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">CA</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-[var(--fg)]">{fmtTHB(store.revenue_total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Clients</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-[var(--fg)]">{fmtInt(store.ticket_count)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Panier</p>
                      <p className="font-mono text-sm font-semibold tabular-nums text-[var(--fg)]">{fmtTHB(store.avg_ticket)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded bg-[var(--bg-2)] px-1.5 py-0.5 font-mono tabular-nums text-[var(--fg-3)]">Cash {fmtTHB(store.payments.cash)}</span>
                    <span className="rounded bg-[var(--bg-2)] px-1.5 py-0.5 font-mono tabular-nums text-[var(--fg-3)]">Scan {fmtTHB(store.payments.scan)}</span>
                    <span className="rounded bg-[var(--bg-2)] px-1.5 py-0.5 font-mono tabular-nums text-[var(--fg-3)]">Card {fmtTHB(store.payments.credit_card)}</span>
                  </div>
                  {(store.unmapped.line_items > 0 || store.unmapped.payments > 0) && (
                    <p className="text-xs text-[var(--warn)]">
                      Non mappé: {store.unmapped.line_items} lignes · {store.unmapped.payments} paiements
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

      {/* Breakdowns + Donuts */}
      {!loading && perStore.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Buckets vente</CardTitle>
              <p className="text-xs text-[var(--fg-4)]">{selectedDate} · total {fmtTHB(bucketsTotal)} {selectedStore !== "all" ? "(filtré)" : ""}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Donut
                data={[
                  { label: "Drinks", value: totalBuckets.drinks },
                  { label: "Ticket", value: totalBuckets.ticket },
                  { label: "Snacks", value: totalBuckets.snack },
                  { label: "Goodies", value: totalBuckets.goodies },
                  { label: "Surcharge", value: totalBuckets.surcharge },
                ].filter((d) => d.value > 0)}
                colors={["var(--bronze)", "var(--info)", "var(--good)", "var(--warn)", "var(--fg-4)"]}
              />
              <div className="space-y-2 pt-2">
                <BreakdownBar label="Drinks" value={totalBuckets.drinks} total={bucketsTotal} tone="var(--bronze)" />
                <BreakdownBar label="Ticket" value={totalBuckets.ticket} total={bucketsTotal} tone="var(--info)" />
                <BreakdownBar label="Snacks" value={totalBuckets.snack} total={bucketsTotal} tone="var(--good)" />
                <BreakdownBar label="Goodies" value={totalBuckets.goodies} total={bucketsTotal} tone="var(--warn)" />
                <BreakdownBar label="Surcharge" value={totalBuckets.surcharge} total={bucketsTotal} tone="var(--fg-4)" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mix paiements</CardTitle>
              <p className="text-xs text-[var(--fg-4)]">{selectedDate} · total {fmtTHB(paymentsTotal)} {selectedStore !== "all" ? "(filtré)" : ""}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Donut
                data={[
                  { label: "Cash", value: totalPayments.cash },
                  { label: "Scan/QR", value: totalPayments.scan },
                  { label: "Card", value: totalPayments.credit_card },
                ].filter((d) => d.value > 0)}
                colors={["var(--good)", "var(--info)", "var(--bronze)"]}
              />
              <div className="space-y-2 pt-2">
                <BreakdownBar label="Cash" value={totalPayments.cash} total={paymentsTotal} tone="var(--good)" />
                <BreakdownBar label="Scan/QR" value={totalPayments.scan} total={paymentsTotal} tone="var(--info)" />
                <BreakdownBar label="Card" value={totalPayments.credit_card} total={paymentsTotal} tone="var(--bronze)" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
