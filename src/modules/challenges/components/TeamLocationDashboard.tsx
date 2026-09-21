"use client";

import { Leaf } from "lucide-react";
import type { LocationOverview } from "@/modules/challenges/overview-data";
import {
  SNACKS_BONUS,
  PANIER_BONUS,
  OPEX_BONUS,
  REVIEWS_VOLUME_BONUS,
  REVIEWS_RATING_BONUS,
} from "@/modules/challenges/constants";
import { buildTeamMetrics, shortLocationName, type TeamMetricRow } from "@/modules/challenges/team-metrics";

const MERCH_BONUS_BY_TIER = [0, 1500, 3000, 5000] as const;

type TeamRowStatus = "earned" | "waiting" | "missed" | "nodata";

interface RowState {
  passes: boolean | null;
  locked: boolean;
  earned: number;
  waiting: number;
  max: number;
}

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
): { label: string; cls: string } {
  if (unlocked) return { label: "Sales target reached ✓", cls: "text-[var(--good)]" };
  if (isMonthPast(month)) return { label: "Sales target missed", cls: "text-[var(--fg-3)]" };
  if (ratio !== null && ratio >= 0.9) return { label: "Almost there — keep pushing!", cls: "text-[var(--warn)]" };
  if (amount !== null && threshold !== null && amount < threshold) {
    return { label: `${fmt(threshold - amount, 0)} ฿ left to reach the target`, cls: "text-[var(--fg-3)]" };
  }
  return { label: "In progress", cls: "text-[var(--fg-3)]" };
}

function rowStatus(s: RowState): TeamRowStatus {
  if (s.passes === null) return "nodata";
  if (s.passes === true) return s.locked ? "waiting" : "earned";
  return "missed";
}

function StatusPill({ status }: { status: TeamRowStatus }) {
  if (status === "earned") {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-[var(--good-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--good)]">
        Earned ✓
      </span>
    );
  }
  if (status === "waiting") {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-[var(--warn-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--warn)]">
        Waiting for sales
      </span>
    );
  }
  if (status === "missed") {
    return (
      <span className="inline-block whitespace-nowrap rounded-full bg-[var(--bg-2)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--fg-3)]">
        Not yet
      </span>
    );
  }
  return (
    <span className="inline-block whitespace-nowrap rounded-full border border-[var(--line)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--fg-4)]">
      No data
    </span>
  );
}

function MetricIcon({ metric }: { metric: TeamMetricRow }) {
  const Icon = metric.icon;
  return (
    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-2)] text-[var(--fg-3)]">
      <Icon className="size-3" aria-hidden />
    </div>
  );
}

function AdviceCard({ metric, state }: { metric: TeamMetricRow; state: RowState }) {
  const status = rowStatus(state);
  const tip = status === "earned" ? metric.achievedTip : metric.adviceTip;
  return (
    <div className="flex min-w-0 flex-col rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--paper-2)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <MetricIcon metric={metric} />
        <p className="text-[11px] font-semibold leading-tight text-[var(--fg)]">
          {metric.letter}. {metric.label}
        </p>
      </div>
      <div className="mb-2">
        <StatusPill status={status} />
      </div>
      <p className="mb-1 font-mono text-[11px] tabular-nums text-[var(--fg-3)]">{metric.gapPrimary}</p>
      <p className="mt-auto text-[10px] leading-relaxed text-[var(--fg-3)]">{tip}</p>
    </div>
  );
}

function MetricTableRow({ metric, state }: { metric: TeamMetricRow; state: RowState }) {
  const status = rowStatus(state);
  const progressLine =
    status === "earned"
      ? "Target hit — bonus paid."
      : status === "waiting"
        ? "Target hit — paid once sales target is reached."
        : status === "missed"
          ? (metric.gapSecondary ?? metric.gapPrimary)
          : "Waiting for data.";
  return (
    <tr className="border-b border-[var(--line)] last:border-b-0">
      <td className="py-2 pl-3 pr-3">
        <div className="flex items-center gap-2">
          <MetricIcon metric={metric} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--fg)]">
              {metric.letter}. {metric.label}
            </p>
            <p className="text-[10px] text-[var(--fg-4)]">{metric.subtitle}</p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-base font-bold tabular-nums text-[var(--fg)]">
        {metric.current}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        <p className="font-mono text-xs tabular-nums text-[var(--fg-2)]">{metric.target}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-[var(--fg-4)]">{progressLine}</p>
      </td>
      <td className="whitespace-nowrap py-2 pl-3 pr-2 text-right">
        <StatusPill status={status} />
      </td>
      <td className="whitespace-nowrap py-2 pl-2 pr-4 text-right font-mono text-xs font-bold tabular-nums">
        {status === "earned" ? (
          <span className="text-[var(--good)]">฿{fmt(state.earned, 0)}</span>
        ) : status === "waiting" ? (
          <span className="text-[var(--warn)]">฿{fmt(state.waiting, 0)} to unlock</span>
        ) : (
          <span className="font-semibold text-[var(--fg-4)]">up to ฿{fmt(state.max, 0)}</span>
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
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-20 rounded-[var(--r-sm)] bg-[var(--bg-2)]" />
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

  const merchTier = loc.merchandising.tier;
  const merchPass = merchTier > 0 ? true : loc.merchandising.ratio !== null ? false : null;

  // Same model as the Team PDF: "earned" = target hit AND payable
  // (sales reached — merchandise never needs sales). "waiting" = target hit
  // but sales missed → would have been paid otherwise.
  const states: RowState[] = [
    { passes: merchPass, locked: false, earned: MERCH_BONUS_BY_TIER[merchTier] ?? 0, waiting: 0, max: 5000 },
    { passes: loc.snacks.passes, locked: revenueLocked, earned: loc.snacks.bonus, waiting: loc.snacks.passes === true && revenueLocked ? SNACKS_BONUS : 0, max: SNACKS_BONUS },
    { passes: loc.panierMoyen.passes, locked: revenueLocked, earned: loc.panierMoyen.bonus, waiting: loc.panierMoyen.passes === true && revenueLocked ? PANIER_BONUS : 0, max: PANIER_BONUS },
    { passes: loc.opex.passes, locked: revenueLocked, earned: loc.opex.bonus, waiting: loc.opex.passes === true && revenueLocked ? OPEX_BONUS : 0, max: OPEX_BONUS },
    { passes: loc.reviews.volumePass, locked: revenueLocked, earned: loc.reviews.volumeBonus, waiting: loc.reviews.volumePass === true && revenueLocked ? REVIEWS_VOLUME_BONUS : 0, max: REVIEWS_VOLUME_BONUS },
    { passes: loc.reviews.ratingPass, locked: revenueLocked, earned: loc.reviews.ratingBonus, waiting: loc.reviews.ratingPass === true && revenueLocked ? REVIEWS_RATING_BONUS : 0, max: REVIEWS_RATING_BONUS },
  ];

  const earnedCount = states.filter((s) => rowStatus(s) === "earned").length;
  const waitingCount = states.filter((s) => rowStatus(s) === "waiting").length;
  const waitingBonus = states.reduce((sum, s) => sum + s.waiting, 0);

  const pctOfTarget = threshold !== null && ratio !== null ? Math.round(ratio * 100) : null;
  const targetStatus = salesTargetStatus(!!unlocked, ratio, monthKey, amount, threshold);
  const metrics = buildTeamMetrics(loc, month);
  const barColor = unlocked ? "var(--good)" : "var(--fg-3)";

  return (
    <article className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--line)] bg-transparent p-4 md:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-medium italic text-[var(--fg)]">
            {shortLocationName(loc.locationTitle)}
          </h2>
          <p className="text-xs text-[var(--fg-4)]">Monthly Challenge — your bonus, simply explained</p>
        </div>
        <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-3)]">
          Capybara Coffee
        </p>
      </div>

      {/* How it works — same short explainer as the Team PDF */}
      <div className="rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--bg-2)]/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-[var(--fg-3)]">
        <span className="font-semibold text-[var(--fg)]">How your bonus works: </span>
        each challenge has a target. Hit it and the bonus is{" "}
        <span className="inline-block whitespace-nowrap rounded-full bg-[var(--good-soft)] px-2 py-px text-[10px] font-bold text-[var(--good)]">
          Earned ✓
        </span>{" "}
        — with one rule: apart from Merchandise, bonuses are only paid if the shop also reaches its{" "}
        <span className="font-semibold text-[var(--fg)]">monthly sales target</span>.{" "}
        <span className="inline-block whitespace-nowrap rounded-full bg-[var(--warn-soft)] px-2 py-px text-[10px] font-bold text-[var(--warn)]">
          Waiting for sales
        </span>{" "}
        means you hit the target but sales were missed, so it is not paid.{" "}
        <span className="inline-block whitespace-nowrap rounded-full bg-[var(--bg-2)] px-2 py-px text-[10px] font-bold text-[var(--fg-3)]">
          Not yet
        </span>{" "}
        means the target was not hit yet.
      </div>

      {/* KPI row — 1. sales (the key) · 2. earned · 3. would-have-been-extra */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-[var(--r-sm)] border border-[var(--line)] border-t-2 border-t-[var(--fg-3)] bg-transparent px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">
            1 · Monthly sales — the key target
          </p>
          <p className="font-mono text-xl font-bold tabular-nums text-[var(--fg)]">
            {amount !== null ? `฿${fmt(amount, 0)}` : "—"}
            {threshold !== null && (
              <span className="ml-1.5 text-sm font-semibold text-[var(--fg-4)]">
                / ฿{fmt(threshold, 0)}
              </span>
            )}
            {pctOfTarget !== null && (
              <span className="ml-1.5 text-sm font-semibold text-[var(--fg-4)]">{pctOfTarget}%</span>
            )}
          </p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-2)]">
            {pctOfTarget !== null && (
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pctOfTarget)}%`, background: barColor }}
              />
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className={`text-[11px] font-semibold ${targetStatus.cls}`}>{targetStatus.label}</span>
            {(loc.entryCount !== null || loc.snacksSold !== null) && (
              <span className="text-[10px] text-[var(--fg-4)]">
                {loc.entryCount !== null && `${fmt(loc.entryCount, 0)} visitors`}
                {loc.entryCount !== null && loc.snacksSold !== null && " · "}
                {loc.snacksSold !== null && `${fmt(loc.snacksSold, 0)} animal food`}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-[var(--r-sm)] border border-[var(--line)] border-t-2 border-t-[var(--good)] bg-[var(--good-soft)]/40 px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">2 · Bonus earned</p>
          <p className="font-mono text-xl font-bold tabular-nums text-[var(--fg)]">฿{fmt(totalBonus, 0)}</p>
          <p className="mt-0.5 text-[10px] text-[var(--fg-3)]">{earnedCount} of 6 challenges earned and paid.</p>
        </div>

        <div className="flex flex-col justify-center rounded-[var(--r-sm)] border border-[var(--line)] border-t-2 border-t-[var(--warn)] bg-[var(--warn-soft)]/40 px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--fg-4)]">3 · Would have been extra</p>
          <p className="font-mono text-xl font-bold tabular-nums text-[var(--fg)]">฿{fmt(waitingBonus, 0)}</p>
          <p className="mt-0.5 text-[10px] text-[var(--fg-3)]">
            {waitingCount === 0
              ? "Nothing waiting — every hit target is paid."
              : `${waitingCount} challenge${waitingCount === 1 ? "" : "s"} hit, but not paid because sales were missed.`}
          </p>
        </div>
      </div>

      {/* Challenges table — earned or still to unlock? */}
      <section>
        <h3 className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-4)]">
          Your challenges — earned or still to unlock?
        </h3>
        <p className="mb-2 text-[11px] text-[var(--fg-4)]">
          “Earned” = target hit and paid. “Waiting for sales” = target hit but not paid because monthly sales were
          missed. “Not yet” = target not hit.
        </p>
        <div className="overflow-x-auto rounded-[var(--r-sm)] border border-[var(--line)]">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[var(--line)] bg-transparent">
                <th className="py-2 pl-3 pr-3 text-left text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Challenge
                </th>
                <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Result
                </th>
                <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Target
                </th>
                <th className="py-2 pl-3 pr-2 text-right text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Status
                </th>
                <th className="py-2 pl-2 pr-4 text-right text-[8px] font-semibold uppercase tracking-widest text-[var(--fg-4)]">
                  Bonus
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <MetricTableRow key={m.id} metric={m} state={states[i]} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Focus next */}
      <section>
        <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-4)]">
          What to focus on next
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m, i) => (
            <AdviceCard key={m.id} metric={m} state={states[i]} />
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
