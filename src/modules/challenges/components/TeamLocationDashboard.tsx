"use client";

import { Check, Leaf } from "lucide-react";
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

function isMonthPast(month: string): boolean {
  const [y, m] = month.split("-").map(Number);
  const now = new Date();
  return y < now.getFullYear() || (y === now.getFullYear() && m - 1 < now.getMonth());
}

function salesTargetStatus(
  unlocked: boolean,
  ratio: number | null,
  month: string,
  amount: number | null,
  threshold: number | null,
): { label: string; tone: "good" | "warn" | "bad" | "neutral" } {
  if (unlocked) return { label: "Sales target achieved!", tone: "good" };
  const past = isMonthPast(month);
  if (past) return { label: "Target not reached", tone: "bad" };
  if (ratio !== null && ratio >= 0.9) return { label: "Almost there!", tone: "warn" };
  if (amount !== null && threshold !== null && amount < threshold) {
    return { label: `${fmt(threshold - amount, 0)} ฿ to go`, tone: "neutral" };
  }
  return { label: "In progress", tone: "neutral" };
}

function statusTextColor(passes: boolean | null): string {
  if (passes === true) return "text-[var(--good)]";
  if (passes === false) return "text-[var(--warn)]";
  return "text-[var(--fg-4)]";
}

function rowBg(passes: boolean | null): string {
  if (passes === true) return "bg-[var(--good-soft)]/60";
  if (passes === false) return "bg-[var(--warn-soft)]/50";
  return "";
}

function statusToneClass(tone: "good" | "warn" | "bad" | "neutral"): string {
  if (tone === "good") return "text-[var(--good)]";
  if (tone === "warn") return "text-[var(--warn)]";
  if (tone === "bad") return "text-[var(--bad)]";
  return "text-[var(--fg-3)]";
}

function MetricIcon({ metric, size = "sm" }: { metric: TeamMetricRow; size?: "sm" | "xs" }) {
  const Icon = metric.icon;
  const box = size === "xs" ? "size-6" : "size-7";
  const icon = size === "xs" ? "size-3" : "size-3.5";
  return (
    <div className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-[var(--bg-2)] text-[var(--fg-3)]`}>
      <Icon className={icon} aria-hidden />
    </div>
  );
}

function AdviceCard({ metric }: { metric: TeamMetricRow }) {
  const achieved = metric.gapPasses === true;
  const tip = achieved ? metric.achievedTip : metric.adviceTip;
  const gapBg = achieved
    ? "bg-[var(--good-soft)] text-[var(--good)]"
    : metric.gapPasses === false
      ? "bg-[var(--warn-soft)] text-[var(--warn)]"
      : "bg-[var(--bg-2)] text-[var(--fg-3)]";

  return (
    <div className="flex min-w-[148px] flex-col rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--paper-2)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <MetricIcon metric={metric} size="xs" />
        <p className="text-[11px] font-semibold leading-tight text-[var(--fg)]">
          {metric.letter}. {metric.label}
        </p>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Current</p>
          <p className={`mt-0.5 font-mono text-sm font-bold tabular-nums leading-none ${statusTextColor(metric.currentPasses)}`}>
            {metric.current}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--fg-4)]">Target</p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums leading-none text-[var(--fg-2)]">
            {metric.target}
          </p>
        </div>
      </div>

      <p className={`mb-2 rounded-[var(--r-sm)] px-2 py-1.5 text-[11px] font-semibold leading-snug ${gapBg}`}>
        {achieved ? metric.gapPrimary : metric.gapPrimary}
      </p>

      <p className="mt-auto text-[10px] leading-relaxed text-[var(--fg-3)]">{tip}</p>
    </div>
  );
}

function MetricTableRow({ metric }: { metric: TeamMetricRow }) {
  return (
    <tr className={`border-b border-[var(--line)] last:border-b-0 ${rowBg(metric.currentPasses)}`}>
      <td className="py-2 pl-3 pr-3">
        <div className="flex items-center gap-2">
          <MetricIcon metric={metric} size="xs" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--fg)]">
              {metric.letter}. {metric.label}
            </p>
            <p className="text-[10px] text-[var(--fg-4)]">{metric.subtitle}</p>
          </div>
        </div>
      </td>
      <td className={`py-2 px-3 text-right font-mono text-base font-bold tabular-nums whitespace-nowrap ${statusTextColor(metric.currentPasses)}`}>
        {metric.current}
      </td>
      <td className="py-2 px-3 text-right font-mono text-xs tabular-nums text-[var(--fg-2)] whitespace-nowrap">
        {metric.target}
      </td>
      <td className="py-2 pl-3 pr-4 text-right">
        <p className={`font-mono text-xs font-semibold tabular-nums ${statusTextColor(metric.gapPasses)}`}>
          {metric.gapPrimary}
        </p>
        {metric.gapSecondary && (
          <p className="mt-0.5 text-[10px] leading-snug text-[var(--fg-4)]">{metric.gapSecondary}</p>
        )}
      </td>
    </tr>
  );
}

export function TeamLocationDashboard({
  loc,
  month,
  loading,
}: {
  loc?: LocationOverview;
  month?: string;
  loading: boolean;
}) {
  if (loading || !loc) {
    return (
      <div className="animate-pulse rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="mb-4 h-7 w-40 rounded bg-[var(--bg-2)]" />
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="h-20 rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
          <div className="h-20 rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
        </div>
        <div className="h-48 rounded bg-[var(--bg-2)]" />
      </div>
    );
  }

  const { amount, threshold, unlocked, ratio } = loc.revenue;
  const totalBonus = loc.totalBonus;
  const revenueLocked = threshold !== null && unlocked === false;
  const monthKey = month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const potentialLockedBonus = revenueLocked
    ? (loc.snacks.passes === true ? SNACKS_BONUS : 0) +
      (loc.panierMoyen.passes === true ? PANIER_BONUS : 0) +
      (loc.opex.passes === true ? OPEX_BONUS : 0) +
      (loc.reviews.volumePass === true ? REVIEWS_VOLUME_BONUS : 0) +
      (loc.reviews.ratingPass === true ? REVIEWS_RATING_BONUS : 0)
    : 0;

  const pctOfTarget = threshold !== null && ratio !== null ? Math.round(ratio * 100) : null;
  const targetStatus = salesTargetStatus(!!unlocked, ratio, monthKey, amount, threshold);
  const metrics = buildTeamMetrics(loc);
  const barColor = unlocked ? "var(--good)" : targetStatus.tone === "warn" ? "var(--warn)" : "var(--bronze)";

  return (
    <article className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-medium italic text-[var(--fg)]">
            {shortLocationName(loc.locationTitle)}
          </h2>
          <p className="text-xs text-[var(--fg-4)]">Monthly Challenge</p>
        </div>
        <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-3)]">
          Capybara Coffee
        </p>
      </div>

      {/* KPI row — sales (combined) + bonus */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
        <div className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">Sales this month</p>
              <p className="font-mono text-xl font-bold tabular-nums text-[var(--fg)]">
                {amount !== null ? `฿${fmt(amount, 0)}` : "—"}
                {threshold !== null && (
                  <span className="ml-1.5 text-sm font-semibold text-[var(--fg-4)]">
                    / ฿{fmt(threshold, 0)} target
                  </span>
                )}
              </p>
            </div>
            {pctOfTarget !== null && (
              <p className={`font-mono text-lg font-bold tabular-nums ${unlocked ? "text-[var(--good)]" : "text-[var(--bronze-2)]"}`}>
                {pctOfTarget}%
              </p>
            )}
          </div>

          <div className="mt-2.5 h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
            {pctOfTarget !== null && (
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pctOfTarget)}%`, background: barColor }}
              />
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {unlocked && <Check className="size-3.5 text-[var(--good)]" aria-hidden />}
            <span className={`text-[11px] font-semibold ${statusToneClass(targetStatus.tone)}`}>
              {targetStatus.label}
            </span>
            {(loc.entryCount !== null || loc.snacksSold !== null) && (
              <span className="text-[10px] text-[var(--fg-4)]">
                {loc.entryCount !== null && `${fmt(loc.entryCount, 0)} visitors`}
                {loc.entryCount !== null && loc.snacksSold !== null && " · "}
                {loc.snacksSold !== null && `${fmt(loc.snacksSold, 0)} snacks`}
              </span>
            )}
          </div>
        </div>

        <div className="flex min-w-[140px] flex-col justify-center rounded-[var(--r-sm)] border border-[var(--bronze)]/25 bg-[var(--bronze-soft)] px-4 py-3 md:min-w-[160px]">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">Bonus earned</p>
          <p className={`font-mono text-xl font-bold tabular-nums ${totalBonus > 0 ? "text-[var(--fg)]" : "text-[var(--fg-4)]"}`}>
            ฿{fmt(totalBonus, 0)}
          </p>
          {potentialLockedBonus > 0 && (
            <p className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--bronze-2)]" title="Unlocks once sales target is reached">
              +{fmt(potentialLockedBonus, 0)} locked
            </p>
          )}
        </div>
      </div>

      {/* Performance table */}
      <section>
        <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-4)]">
          How are we doing?
        </h3>
        <div className="overflow-x-auto rounded-[var(--r-sm)] border border-[var(--line)]">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--bg-2)]">
                <th className="py-2 pl-3 pr-3 text-left text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Metric
                </th>
                <th className="py-2 px-3 text-right text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Current
                </th>
                <th className="py-2 px-3 text-right text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Target
                </th>
                <th className="py-2 pl-3 pr-4 text-right text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
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

      {/* General advice */}
      <section>
        <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-4)]">
          General advice
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((m) => (
            <AdviceCard key={m.id} metric={m} />
          ))}
        </div>
      </section>

      <footer className="flex items-center justify-center gap-1.5 pt-1 text-center">
        <Leaf className="size-3 text-[var(--fg-4)]" aria-hidden />
        <p className="text-[10px] italic text-[var(--fg-4)]">
          Small actions every day lead to big results. Let&apos;s keep growing together!
        </p>
      </footer>
    </article>
  );
}
