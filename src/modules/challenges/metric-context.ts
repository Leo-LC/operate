import type { LocationOverview } from "@/app/api/challenges/overview/route";
import {
  MERCH_TIERS,
  SNACKS_THRESHOLD,
  PANIER_THRESHOLD,
  OPEX_THRESHOLD_DEFAULT,
  REVIEWS_VOLUME_THRESHOLD,
  REVIEWS_MIN_COUNT,
} from "./constants";

export interface MetricContext {
  headline: string;
  detail: string;
  gap?: string;
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function gatePrefix(loc: LocationOverview): string {
  const locked = loc.revenue.threshold !== null && loc.revenue.unlocked === false;
  return locked ? "Unlocks after sales target: " : "";
}

export function buildRevenueContext(loc: LocationOverview): MetricContext {
  const { amount, threshold } = loc.revenue;

  if (threshold === null) {
    const amountStr = amount !== null ? `${fmt(amount, 0)} ฿` : "—";
    return {
      headline: amountStr,
      detail: "Hit monthly sales to unlock snack, spend, costs & review bonuses",
    };
  }

  const amountStr = amount !== null ? fmt(amount, 0) : "—";
  const headline = `${amountStr} / ${fmt(threshold, 0)} ฿`;

  let gap: string | undefined;
  if (amount !== null && amount < threshold) {
    gap = `${fmt(threshold - amount, 0)} ฿ to go`;
  }

  return {
    headline,
    detail: "Hit monthly sales to unlock snack, spend, costs & review bonuses",
    gap,
  };
}

export function buildMerchContext(loc: LocationOverview): MetricContext {
  const { ratio, tier } = loc.merchandising;
  const sales = loc.salesNetIncVat;
  const goodies = loc.salesGoodiesNet;

  if (ratio === null || sales === null || sales <= 0) {
    return {
      headline: "—",
      detail: "Merch & goodies should be at least 7% of total sales",
    };
  }

  const tier1Target = Math.ceil(sales * MERCH_TIERS[2].threshold);
  const tier2Target = Math.ceil(sales * MERCH_TIERS[1].threshold);
  const tier3Target = Math.ceil(sales * MERCH_TIERS[0].threshold);
  const goodiesAmt = goodies ?? 0;

  let headline: string;
  if (tier >= 3) {
    headline = `${fmt(goodiesAmt, 0)} ฿ — Tier 3 (9%+)`;
  } else if (tier >= 2) {
    headline = `${fmt(goodiesAmt, 0)} ฿ / ${fmt(tier3Target, 0)} ฿ for Tier 3`;
  } else if (tier >= 1) {
    headline = `${fmt(goodiesAmt, 0)} ฿ / ${fmt(tier2Target, 0)} ฿ for Tier 2`;
  } else {
    headline = `${fmt(goodiesAmt, 0)} ฿ / ${fmt(tier1Target, 0)} ฿`;
  }

  const pctStr = `${(ratio * 100).toFixed(1)}%`;
  let detail = `Merch & goodies = 7% of sales for 1,500 ฿ bonus (${pctStr} now)`;
  if (tier < 3) {
    const nextThreshold = tier === 0 ? 0.07 : tier === 1 ? 0.08 : 0.09;
    const nextAmt = Math.ceil(sales * nextThreshold);
    const nextPct = `${(nextThreshold * 100).toFixed(0)}%`;
    detail += ` · next tier at ${nextPct} (${fmt(nextAmt, 0)} ฿)`;
  }

  let gap: string | undefined;
  if (tier === 0 && goodiesAmt < tier1Target) {
    gap = `${fmt(tier1Target - goodiesAmt, 0)} ฿ below Tier 1`;
  }

  return { headline, detail, gap };
}

export function buildSnacksContext(loc: LocationOverview): MetricContext {
  const { entryCount, snacksSold } = loc;

  if (entryCount === null || snacksSold === null) {
    return {
      headline: "—",
      detail: `${gatePrefix(loc)}Enter visitor & snack counts below to track this`,
    };
  }

  if (entryCount <= 0) {
    return {
      headline: "—",
      detail: `${gatePrefix(loc)}Enter visitor counts to track snack sales`,
    };
  }

  const targetSnacks = Math.ceil(entryCount * SNACKS_THRESHOLD);
  const headline = `${fmt(snacksSold, 0)} / ${fmt(targetSnacks, 0)} sold`;
  const detail = `${gatePrefix(loc)}${fmt(entryCount, 0)} visitors → aim for ~1 snack per 2 visitors (45%)`;

  let gap: string | undefined;
  if (snacksSold < targetSnacks) {
    gap = `Short by ${fmt(targetSnacks - snacksSold, 0)} snacks`;
  }

  return { headline, detail, gap };
}

export function buildPanierContext(loc: LocationOverview): MetricContext {
  const { entryCount, salesNetIncVat, salesTicketNet } = loc;
  const value = loc.panierMoyen.value;

  if (entryCount === null || entryCount <= 0) {
    return {
      headline: "—",
      detail: `${gatePrefix(loc)}Enter visitor counts to track spend per visit`,
    };
  }

  if (salesNetIncVat === null) {
    return {
      headline: value !== null ? `${fmt(value, 0)} ฿ / visitor` : "—",
      detail: `${gatePrefix(loc)}Product sales (excl. tickets) should average ${PANIER_THRESHOLD} ฿ per visitor`,
    };
  }

  const productRevenue = salesNetIncVat - (salesTicketNet ?? 0);
  const targetRevenue = entryCount * PANIER_THRESHOLD;
  const headline = value !== null ? `${fmt(value, 0)} ฿ / visitor` : "—";
  const detail = `${gatePrefix(loc)}Product sales (excl. tickets) should average ${PANIER_THRESHOLD} ฿ per visitor — target ${fmt(targetRevenue, 0)} ฿ on ${fmt(entryCount, 0)} visitors`;

  let gap: string | undefined;
  if (productRevenue < targetRevenue) {
    gap = `${fmt(targetRevenue - productRevenue, 0)} ฿ below target`;
  }

  return { headline, detail, gap };
}

export function buildOpexContext(loc: LocationOverview): MetricContext {
  const { opexSum, salesNetIncVat } = loc;
  const ratio = loc.opex.ratio;

  if (ratio === null || salesNetIncVat === null || salesNetIncVat <= 0 || opexSum === null) {
    return {
      headline: ratio !== null ? `${(ratio * 100).toFixed(1)}%` : "—",
      detail: `${gatePrefix(loc)}Keep drinks + animals + Makro costs below 9.5% of sales`,
    };
  }

  const maxSpend = Math.floor(salesNetIncVat * OPEX_THRESHOLD_DEFAULT);
  const headline = `${fmt(opexSum, 0)} ฿ / ${fmt(maxSpend, 0)} ฿ max`;
  const detail = `${gatePrefix(loc)}Keep drinks + animals + Makro costs below 9.5% of sales (${fmt(salesNetIncVat, 0)} ฿ sales → max ${fmt(maxSpend, 0)} ฿)`;

  let gap: string | undefined;
  if (opexSum > maxSpend) {
    gap = `${fmt(opexSum - maxSpend, 0)} ฿ over cap (${(ratio * 100).toFixed(1)}%)`;
  }

  return { headline, detail, gap };
}

export function buildReviewVolumeContext(loc: LocationOverview): MetricContext {
  const { entryCount } = loc;
  const { count, volumeRatio } = loc.reviews;

  if (entryCount === null || entryCount <= 0) {
    return {
      headline: count > 0 ? `${fmt(count, 0)} reviews` : "—",
      detail: `${gatePrefix(loc)}Enter visitor counts to track review rate`,
    };
  }

  const targetReviews = Math.ceil(entryCount * REVIEWS_VOLUME_THRESHOLD);
  const headline = `${fmt(count, 0)} / ${fmt(targetReviews, 0)} reviews`;
  const detail = `${gatePrefix(loc)}Ask at least 4 Google reviews per 100 visitors — ${fmt(entryCount, 0)} visitors → aim for ${fmt(targetReviews, 0)}`;

  let gap: string | undefined;
  if (count < targetReviews) {
    gap = `Need ${fmt(targetReviews - count, 0)} more review${targetReviews - count === 1 ? "" : "s"}`;
  }

  // Suppress gap when volumeRatio is null but we have partial data
  if (volumeRatio === null && count === 0) {
    return { headline: "0 / " + fmt(targetReviews, 0) + " reviews", detail, gap: `Need ${fmt(targetReviews, 0)} reviews` };
  }

  return { headline, detail, gap };
}

export function buildReviewRatingContext(loc: LocationOverview): MetricContext {
  const { count, avgRating, currentRating, ratingTarget } = loc.reviews;

  if (count < REVIEWS_MIN_COUNT) {
    return {
      headline: count > 0 ? `${avgRating.toFixed(1)} ★ avg` : "—",
      detail: `${gatePrefix(loc)}Only ${fmt(count, 0)} review${count === 1 ? "" : "s"} so far — need ${REVIEWS_MIN_COUNT} before this counts`,
      gap: count < REVIEWS_MIN_COUNT ? `Need ${REVIEWS_MIN_COUNT - count} more review${REVIEWS_MIN_COUNT - count === 1 ? "" : "s"}` : undefined,
    };
  }

  if (currentRating <= 0 || ratingTarget <= 0) {
    return {
      headline: `${avgRating.toFixed(1)} ★ avg`,
      detail: `${gatePrefix(loc)}This month's average must beat Google by 0.1★`,
    };
  }

  const headline = `${avgRating.toFixed(1)} ★ avg`;
  const detail = `${gatePrefix(loc)}Beat Google (${currentRating.toFixed(1)}★) → need ${ratingTarget.toFixed(1)}★ average this month, with at least ${REVIEWS_MIN_COUNT} reviews`;

  let gap: string | undefined;
  if (avgRating < ratingTarget) {
    gap = `${(ratingTarget - avgRating).toFixed(1)}★ below target`;
  }

  return { headline, detail, gap };
}

export type ViewMode = "internal" | "team";

export const VIEW_MODE_STORAGE_KEY = "challenges-view-mode";

export function defaultViewMode(isOwner: boolean): ViewMode {
  return isOwner ? "internal" : "team";
}
