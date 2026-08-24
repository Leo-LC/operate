"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { RefreshCwIcon, StoreIcon, ReceiptIcon, TrendingUpIcon, ShoppingBagIcon } from "lucide-react";

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
  snapshots: unknown[];
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

export function LoyverseDashboard() {
  const [selectedDate, setSelectedDate] = React.useState<string>(() => bangkokToday());
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [status, setStatus] = React.useState<StatusData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  const fetchDashboard = React.useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/loyverse/dashboard?date=${dateStr}&days=1`, { cache: "no-store" });
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
      // ignore status fetch errors
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard(selectedDate);
    fetchStatus();
  }, [selectedDate, fetchDashboard, fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/loyverse/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      await Promise.all([fetchDashboard(selectedDate), fetchStatus()]);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  if (status && !status.configured) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Loyverse"
          subtitle="Daily sales from POS — read-only"
          eyebrow="Operations"
        />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--fg-3)]">Loyverse n&apos;est pas configuré.</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Ajoutez LOYVERSE_ACCOUNTS ou LOYVERSE_ACCESS_TOKEN dans Vercel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = data?.kpis;
  const perStore = data?.per_store ?? [];
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
        subtitle="Daily sales from POS — read-only. Aucune écriture dans daily_entries."
        eyebrow="Operations"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-[34px] rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-2 text-[13px] text-[var(--fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            />
            <Button onClick={handleSync} disabled={syncing} size="default">
              <RefreshCwIcon className={cn("size-3.5", syncing && "animate-spin")} />
              {syncing ? "Sync…" : "Synchroniser"}
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
            {status?.snapshot_count ?? 0} snapshots · {status?.account_count ?? 0} comptes
          </span>
          {hasSyncErrors && <span className="text-[var(--warn)]">Certains comptes ont échoué — voir détails par shop</span>}
        </div>
      )}
      {syncError && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{syncError}</div>}
      {error && <div className="rounded-[var(--r-sm)] border border-[var(--bad-soft)] bg-[var(--bad-soft)] px-3 py-2 text-sm text-[var(--bad)]">{error}</div>}

      {/* KPIs */}
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
      ) : kpis ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent>
              <Stat
                label="CA du jour"
                value={fmtTHB(kpis.revenue_total)}
                delta={fmtDelta(kpis.delta_vs_week_ago_pct) ?? undefined}
                deltaDir={kpis.delta_vs_week_ago_pct !== null && kpis.delta_vs_week_ago_pct >= 0 ? "up" : kpis.delta_vs_week_ago_pct !== null ? "down" : "neutral"}
                hint={`${fmtInt(kpis.receipt_count)} tickets · HT ${fmtTHB(Math.max(0, kpis.revenue_total - kpis.vat_7))}`}
                icon={<TrendingUpIcon className="size-4" />}
                iconColor="var(--bronze)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Tickets"
                value={fmtInt(kpis.ticket_count)}
                hint={`Reçus ${fmtInt(kpis.receipt_count)} · ${fmtInt(kpis.snacks_sold)} snacks`}
                icon={<ReceiptIcon className="size-4" />}
                iconColor="var(--info)"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stat
                label="Panier moyen"
                value={fmtTHB(kpis.avg_ticket)}
                hint={`TVA 7% ${fmtTHB(kpis.vat_7)}`}
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
                hint={`${status?.account_count ?? 0} comptes · ${fmtInt(kpis.snacks_sold)} snacks`}
                icon={<StoreIcon className="size-4" />}
                iconColor="var(--warn)"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Per-shop grid */}
      {!loading && perStore.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--fg-3)]">Pas de données pour {selectedDate}.</p>
            <p className="mt-1 text-xs text-[var(--fg-4)]">Lance une synchronisation ou choisis une autre date.</p>
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
                      <CardTitle className="truncate text-[14px]">{store.store_id}</CardTitle>
                      <p className="mt-0.5 text-xs text-[var(--fg-4)]">
                        {store.account_key}
                        {store.location_id ? ` · ${store.location_id.slice(0, 8)}` : " · non mappé"}
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
                      <p className="text-[10px] uppercase tracking-wide text-[var(--fg-4)]">Tickets</p>
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

      {/* Breakdowns */}
      {!loading && perStore.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Buckets vente</CardTitle>
              <p className="text-xs text-[var(--fg-4)]">{selectedDate} · total {fmtTHB(bucketsTotal)}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <BreakdownBar label="Drinks" value={totalBuckets.drinks} total={bucketsTotal} tone="var(--bronze)" />
              <BreakdownBar label="Ticket" value={totalBuckets.ticket} total={bucketsTotal} tone="var(--info)" />
              <BreakdownBar label="Snacks" value={totalBuckets.snack} total={bucketsTotal} tone="var(--good)" />
              <BreakdownBar label="Goodies" value={totalBuckets.goodies} total={bucketsTotal} tone="var(--warn)" />
              <BreakdownBar label="Surcharge" value={totalBuckets.surcharge} total={bucketsTotal} tone="var(--fg-4)" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mix paiements</CardTitle>
              <p className="text-xs text-[var(--fg-4)]">{selectedDate} · total {fmtTHB(paymentsTotal)}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <BreakdownBar label="Cash" value={totalPayments.cash} total={paymentsTotal} tone="var(--good)" />
              <BreakdownBar label="Scan/QR" value={totalPayments.scan} total={paymentsTotal} tone="var(--info)" />
              <BreakdownBar label="Card" value={totalPayments.credit_card} total={paymentsTotal} tone="var(--bronze)" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
