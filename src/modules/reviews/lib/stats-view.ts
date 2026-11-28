// Presentation helpers for the Reviews Stats pilot (docs/ui-pilot).
//
// Pure formatting/comparison logic kept out of the components so it can be
// unit-tested. The metric contract itself (windows, aggregation) stays in
// ./stats.ts — nothing here changes a number, it only labels one.

import type { Granularity, StatsSummary } from "./stats";

export type DeltaTone = "positive" | "negative" | "neutral";
export type DeltaDirection = "up" | "down" | "flat" | "none";

export interface Comparison {
  direction: DeltaDirection;
  tone: DeltaTone;
  /** Compact label for dense table cells, e.g. "0.4%", "0.02", "0.7 pp". */
  text: string;
  /** Full sentence for KPI cards, tooltips and screen readers. */
  detail: string;
  /**
   * Optional precision note for comparisons whose displayed values and delta
   * are rounded independently (ratings). Explains the exact inputs so a
   * rounded 4.78 → 4.81 can still show a 0.02 change honestly.
   */
  note?: string;
}

type Distribution = StatsSummary["distribution"];

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** 0.4 instead of 0.40, 2 instead of 2.0 — keeps compact cards tidy. */
function trim(value: number, digits: number): string {
  return String(round(value, digits));
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-GB");
}

export function formatRating(n: number | null): string {
  // Two decimals so a 0.02 move is visible instead of contradicting a 4.8 → 4.8 display.
  return n == null ? "—" : n.toFixed(2);
}

/** Share 0..1 → "67%" (or "—" when unknown). */
export function formatPercent(share: number | null, digits = 0): string {
  if (share == null || !Number.isFinite(share)) return "—";
  return `${(share * 100).toFixed(digits)}%`;
}

/** Reviews that need attention (1★–3★). */
export function lowStarCount(distribution: Distribution | null | undefined): number {
  if (!distribution) return 0;
  return distribution[0] + distribution[1] + distribution[2];
}

/** Share of 1★–3★ reviews, null when there is nothing to divide by. */
export function lowStarShare(
  distribution: Distribution | null | undefined,
  count: number,
): number | null {
  if (!distribution || count <= 0) return null;
  return lowStarCount(distribution) / count;
}

function signedCount(n: number): string {
  return n > 0 ? `+${formatCount(n)}` : `−${formatCount(Math.abs(n))}`;
}

export function countComparison(current: number, prior: number, period: string): Comparison {
  const diff = current - prior;

  if (prior === 0) {
    if (current === 0) {
      return {
        direction: "none",
        tone: "neutral",
        text: "No reviews",
        detail: "No reviews in either period",
      };
    }
    return {
      direction: "up",
      tone: "positive",
      text: `${formatCount(current)} new`,
      detail: `${formatCount(current)} new reviews; no reviews in the previous ${period}`,
    };
  }

  if (diff === 0) {
    return {
      direction: "flat",
      tone: "neutral",
      text: "No change",
      detail: `No change vs previous ${period}`,
    };
  }

  const direction: DeltaDirection = diff > 0 ? "up" : "down";
  const tone: DeltaTone = diff > 0 ? "positive" : "negative";
  const pct = round((diff / prior) * 100, 1);
  const absoluteDetail = `${formatCount(Math.abs(diff))} reviews vs previous ${period} (previously ${formatCount(prior)})`;

  // A tiny prior baseline (or an extreme percentage) is clearer as an absolute
  // change: "+280 · was 6" instead of "+4666.7%".
  if (prior < 20 || Math.abs(pct) >= 300) {
    return {
      direction,
      tone,
      text: `${signedCount(diff)} · was ${formatCount(prior)}`,
      detail: absoluteDetail,
    };
  }

  // A change that rounds to 0.0% is still a real change; show the count.
  if (pct === 0) {
    return { direction, tone, text: signedCount(diff), detail: absoluteDetail };
  }

  return {
    direction,
    tone,
    text: `${trim(Math.abs(pct), 1)}%`,
    detail: `${trim(Math.abs(pct), 1)}% vs previous ${period}`,
  };
}

export function ratingComparison(
  current: number | null,
  prior: number | null,
  period: string,
): Comparison | null {
  if (current == null) return null;
  if (prior == null) {
    return {
      direction: "none",
      tone: "neutral",
      text: "No baseline",
      detail: "No prior baseline",
    };
  }

  const diff = round(current - prior, 2);
  // Independent rounding can make 4.78 → 4.81 look like a 0.03 move while the
  // real delta is 0.02. Keep the delta unforced and explain the exact inputs.
  const note =
    current.toFixed(4) === prior.toFixed(4)
      ? undefined
      : `delta calculated before rounding: ${current.toFixed(4)} vs ${prior.toFixed(4)}`;

  if (diff === 0) {
    return {
      direction: "flat",
      tone: "neutral",
      text: "No change",
      detail: `No change vs previous ${period}`,
      note,
    };
  }

  const direction: DeltaDirection = diff > 0 ? "up" : "down";
  const amount = Math.abs(diff).toFixed(2);
  return {
    direction,
    tone: diff > 0 ? "positive" : "negative",
    text: amount,
    detail: `${amount} vs previous ${period}`,
    note,
  };
}

/**
 * Percentage-point comparison for shares (1★–3★). A decrease is an
 * improvement, so "down" maps to a positive tone.
 */
export function sharePointComparison(
  current: number | null,
  prior: number | null,
  period: string,
): Comparison | null {
  if (current == null) return null;
  if (prior == null) {
    return {
      direction: "none",
      tone: "neutral",
      text: "No baseline",
      detail: "No prior baseline",
    };
  }

  const diffPp = round((current - prior) * 100, 1);
  if (diffPp === 0) {
    return {
      direction: "flat",
      tone: "neutral",
      text: "No change",
      detail: `No change vs previous ${period}`,
    };
  }

  const direction: DeltaDirection = diffPp > 0 ? "up" : "down";
  const amount = trim(Math.abs(diffPp), 1);
  return {
    direction,
    tone: diffPp > 0 ? "negative" : "positive",
    text: `${amount} pp`,
    detail: `${amount} pp vs previous ${period}`,
  };
}

export interface StarRow {
  star: 1 | 2 | 3 | 4 | 5;
  count: number;
  share: number | null;
}

/** 5★ → 1★, ready for the horizontal distribution bars. */
export function starRows(
  distribution: Distribution | null | undefined,
  count: number,
): StarRow[] {
  const stars = [5, 4, 3, 2, 1] as const;
  return stars.map((star) => {
    const n = distribution?.[star - 1] ?? 0;
    return { star, count: n, share: count > 0 ? n / count : null };
  });
}

/** "5 stars: 882 reviews (90%)" — used as the bar's accessible label. */
export function describeStarRow(row: StarRow): string {
  const plural = row.star === 1 ? "star" : "stars";
  const reviews = row.count === 1 ? "review" : "reviews";
  const share = row.share == null ? "share unavailable" : formatPercent(row.share, 1);
  return `${row.star} ${plural}: ${formatCount(row.count)} ${reviews} (${share})`;
}

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * "26 Sep – 25 Oct 2026" from the UTC window bounds returned by the API.
 * No timestamp is invented: both ends come from the stats response.
 */
export function formatUtcRange(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";

  const fromYear = from.getUTCFullYear();
  const toYear = to.getUTCFullYear();
  const left = dayFmt.format(from);
  const right = dayFmt.format(to);
  return fromYear === toYear ? `${left} – ${right} ${toYear}` : `${left} ${fromYear} – ${right} ${toYear}`;
}

export function granularityNoun(granularity: Granularity): string {
  if (granularity === "day") return "day";
  if (granularity === "month") return "month";
  return "week";
}
