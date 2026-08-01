"use client";

import { Check, Leaf, Star } from "lucide-react";
import type { LocationOverview } from "@/app/api/challenges/overview/route";
import {
  SNACKS_BONUS,
  PANIER_BONUS,
  OPEX_BONUS,
  REVIEWS_VOLUME_BONUS,
  REVIEWS_RATING_BONUS,
} from "@/modules/challenges/constants";
import { buildTeamMetrics, shortLocationName, type TeamMetricRow } from "@/modules/challenges/team-metrics";

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function statusColor(passes: boolean | null): string {
  if (passes === true) return "text-[var(--good)]";
  if (passes === false) return "text-[var(--warn)]";
  return "text-[var(--fg-4)]";
}

function SummaryCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col justify-center rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] px-5 py-4 ${className}`}
    >
      {children}
    </div>
  );
}

function MetricIcon({ metric }: { metric: TeamMetricRow }) {
  const Icon = metric.icon;
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-2)] text-[var(--fg-3)]">
      <Icon className="size-4" aria-hidden />
    </div>
  );
}

function AdviceCard({ metric }: { metric: TeamMetricRow }) {
  const achieved = metric.gapPasses === true;
  const tip = achieved ? metric.achievedTip : metric.adviceTip;

  return (
    <div className="flex flex-1 min-w-0 flex-col gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--paper-2)] px-4 py-3">
      <MetricIcon metric={metric} />
      <p className="text-xs font-semibold text-[var(--fg)]">
        {metric.letter}. {metric.label}
      </p>
      <div className="flex items-baseline gap-2 text-[10px] text-[var(--fg-4)]">
        <span>
          Current <span className={`font-mono font-semibold tabular-nums ${statusColor(metric.currentPasses)}`}>{metric.current}</span>
        </span>
        <span className="text-[var(--line-strong)]">|</span>
        <span>
          Target <span className="font-mono font-semibold tabular-nums text-[var(--fg-2)]">{metric.target}</span>
        </span>
      </div>
      <p className={`text-xs font-semibold ${statusColor(metric.gapPasses)}`}>
        {achieved ? metric.gapPrimary : `Gap: ${metric.gapPrimary}`}
      </p>
      <p className="text-[11px] leading-snug text-[var(--fg-3)]">{tip}</p>
    </div>
  );
}

function MetricTableRow({ metric }: { metric: TeamMetricRow }) {
  return (
    <tr className="border-b border-[var(--line)] last:border-b-0">
      <td className="py-3 pl-4 pr-4">
        <div className="flex items-start gap-3">
          <MetricIcon metric={metric} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--fg)]">
              {metric.letter}. {metric.label}
            </p>
            <p className="text-[11px] text-[var(--fg-4)]">{metric.subtitle}</p>
          </div>
        </div>
      </td>
      <td className={`py-3 px-3 text-right font-mono text-lg font-semibold tabular-nums whitespace-nowrap ${statusColor(metric.currentPasses)}`}>
        {metric.current}
      </td>
      <td className="py-3 px-3 text-right font-mono text-sm tabular-nums text-[var(--fg-2)] whitespace-nowrap">
        {metric.target}
      </td>
      <td className="py-3 pl-3 text-right">
        <p className={`font-mono text-sm font-semibold tabular-nums ${statusColor(metric.gapPasses)}`}>
          {metric.gapPrimary}
        </p>
        {metric.gapSecondary && (
          <p className="mt-0.5 text-[11px] text-[var(--fg-4)]">{metric.gapSecondary}</p>
        )}
      </td>
    </tr>
  );
}

export function TeamLocationDashboard({
  loc,
  loading,
}: {
  loc?: LocationOverview;
  loading: boolean;
}) {
  if (loading || !loc) {
    return (
      <div className="animate-pulse rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-8">
        <div className="mb-6 h-8 w-48 rounded bg-[var(--bg-2)]" />
        <div className="mb-8 grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[var(--r-md)] bg-[var(--bg-2)]" />
          ))}
        </div>
        <div className="h-64 rounded bg-[var(--bg-2)]" />
      </div>
    );
  }

  const { amount, threshold, unlocked, ratio } = loc.revenue;
  const totalBonus = loc.totalBonus;
  const revenueLocked = threshold !== null && unlocked === false;

  const potentialLockedBonus = revenueLocked
    ? (loc.snacks.passes === true ? SNACKS_BONUS : 0) +
      (loc.panierMoyen.passes === true ? PANIER_BONUS : 0) +
      (loc.opex.passes === true ? OPEX_BONUS : 0) +
      (loc.reviews.volumePass === true ? REVIEWS_VOLUME_BONUS : 0) +
      (loc.reviews.ratingPass === true ? REVIEWS_RATING_BONUS : 0)
    : 0;

  const pctOfTarget =
    threshold !== null && ratio !== null ? Math.round(ratio * 100) : null;
  const metrics = buildTeamMetrics(loc);

  return (
    <article className="flex flex-col gap-6 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-medium italic text-[var(--fg)] md:text-4xl">
            {shortLocationName(loc.locationTitle)}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--fg-4)]">Monthly Challenge</p>
        </div>
        <p className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-3)]">
          Capybara Coffee
        </p>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Sales target progress */}
        <SummaryCard>
          <div className="flex items-center gap-2">
            {unlocked === true && <Check className="size-4 text-[var(--good)]" aria-hidden />}
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${unlocked === true ? "text-[var(--good)]" : "text-[var(--bronze-2)]"}`}>
              {unlocked === true ? "Sales target achieved!" : "Sales target progress"}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="flex-1">
              <div className="h-2 rounded-full bg-[var(--bg-2)] overflow-hidden">
                {pctOfTarget !== null && (
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, pctOfTarget)}%`,
                      background: unlocked === true ? "var(--good)" : "var(--bronze)",
                    }}
                  />
                )}
              </div>
            </div>
            {pctOfTarget !== null && (
              <span className={`font-mono text-xl font-bold tabular-nums leading-tight text-right ${unlocked === true ? "text-[var(--good)]" : "text-[var(--bronze-2)]"}`}>
                {pctOfTarget}%<br />
                <span className="text-[10px] font-semibold">of target</span>
              </span>
            )}
          </div>
        </SummaryCard>

        {/* Sales vs target */}
        <SummaryCard>
          <div className="flex items-stretch divide-x divide-[var(--line)]">
            <div className="flex flex-1 flex-col pr-4">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
                Sales this month
              </span>
              <span className={`mt-1 font-mono text-2xl font-bold tabular-nums ${unlocked === true ? "text-[var(--good)]" : "text-[var(--fg)]"}`}>
                {amount !== null ? `฿${fmt(amount, 0)}` : "—"}
              </span>
            </div>
            <div className="flex flex-1 flex-col pl-4">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
                Target
              </span>
              <span className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--fg-2)]">
                {threshold !== null ? `฿${fmt(threshold, 0)}` : "—"}
              </span>
            </div>
          </div>
        </SummaryCard>

        {/* Bonus earned */}
        <SummaryCard className="bg-[var(--bronze-soft)]/30 border-[var(--bronze)]/20">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
            Bonus earned
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`font-mono text-2xl font-bold tabular-nums ${totalBonus > 0 ? "text-[var(--fg)]" : "text-[var(--fg-4)]"}`}>
              ฿{fmt(totalBonus, 0)}
            </span>
            {potentialLockedBonus > 0 && (
              <span className="font-mono text-xs tabular-nums text-[var(--bronze-2)]" title="Unlocks once sales target is reached">
                +{fmt(potentialLockedBonus, 0)} locked
              </span>
            )}
          </div>
          {totalBonus > 0 && <Star className="mt-1 size-3 text-[var(--bronze)]" aria-hidden />}
        </SummaryCard>
      </div>

      {/* Aggregated visitor stats */}
      {(loc.entryCount !== null || loc.snacksSold !== null) && (
        <div className="flex flex-wrap gap-4 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-2)] px-4 py-3">
          {loc.entryCount !== null && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
                Visitors this month
              </span>
              <p className="font-mono text-lg font-semibold tabular-nums text-[var(--fg)]">
                {fmt(loc.entryCount, 0)}
              </p>
            </div>
          )}
          {loc.snacksSold !== null && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
                Snacks sold
              </span>
              <p className="font-mono text-lg font-semibold tabular-nums text-[var(--fg)]">
                {fmt(loc.snacksSold, 0)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Performance table */}
      <section>
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-4)]">
          How are we doing?
        </h3>
        <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--line)]">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg-2)]">
                <th className="py-2.5 pl-4 pr-4 text-left text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Metric
                </th>
                <th className="py-2.5 px-3 text-right text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Current
                </th>
                <th className="py-2.5 px-3 text-right text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Target
                </th>
                <th className="py-2.5 pl-3 pr-4 text-right text-[9px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Gap to reach target
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <MetricTableRow key={m.id} metric={m} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* General advice cards */}
      <section>
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-4)]">
          General advice
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((m) => (
            <AdviceCard key={m.id} metric={m} />
          ))}
        </div>
      </section>

      {/* Footer quote */}
      <footer className="flex items-center justify-center gap-2 pt-2 text-center">
        <Leaf className="size-3.5 text-[var(--fg-4)]" aria-hidden />
        <p className="text-xs italic text-[var(--fg-4)]">
          Small actions every day lead to big results. Let&apos;s keep growing together!
        </p>
      </footer>
    </article>
  );
}
