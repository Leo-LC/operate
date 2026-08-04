import type { LocationOverview } from "@/modules/challenges/overview-data";
import {
  MERCH_TIERS,
  SNACKS_THRESHOLD,
  PANIER_THRESHOLD,
  OPEX_THRESHOLD_DEFAULT,
  REVIEWS_VOLUME_THRESHOLD,
  REVIEWS_MIN_COUNT,
} from "./constants";

export interface MetricContext {
  value: string;
  hint?: string;
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function buildRevenueContext(loc: LocationOverview): MetricContext {
  const { amount, threshold } = loc.revenue;

  if (threshold === null) {
    return {
      value: amount !== null ? `${fmt(amount, 0)} ฿` : "—",
      hint: "Unlocks other bonuses",
    };
  }

  const amountStr = amount !== null ? fmt(amount, 0) : "—";
  const value = `${amountStr} / ${fmt(threshold, 0)} ฿`;
  const hint =
    amount !== null && amount < threshold ? `${fmt(threshold - amount, 0)} ฿ to go` : "Unlocks other bonuses";

  return { value, hint };
}

export function buildMerchContext(loc: LocationOverview): MetricContext {
  const { ratio, tier } = loc.merchandising;
  const sales = loc.salesNetIncVat;
  const goodies = loc.salesGoodiesNet;

  if (ratio === null || sales === null || sales <= 0) {
    return { value: "—", hint: "Target: 7% of sales" };
  }

  const tier1Target = Math.ceil(sales * MERCH_TIERS[2].threshold);
  const goodiesAmt = goodies ?? 0;
  const pctStr = `${(ratio * 100).toFixed(1)}%`;

  if (tier >= 3) return { value: `${pctStr} · Tier 3`, hint: `${fmt(goodiesAmt, 0)} ฿ merch` };
  if (tier >= 2) return { value: `${pctStr} · Tier 2`, hint: `${fmt(goodiesAmt, 0)} ฿ merch` };
  if (tier >= 1) return { value: `${pctStr} · Tier 1`, hint: `${fmt(goodiesAmt, 0)} ฿ merch` };

  return {
    value: `${pctStr} · ${fmt(goodiesAmt, 0)} / ${fmt(tier1Target, 0)} ฿`,
    hint: "Target: 7% of sales",
  };
}

export function buildSnacksContext(loc: LocationOverview): MetricContext {
  const { entryCount, snacksSold } = loc;

  if (entryCount === null || snacksSold === null) {
    return { value: "—", hint: "Enter counts below" };
  }
  if (entryCount <= 0) {
    return { value: "—", hint: "Enter visitors below" };
  }

  const targetSnacks = Math.ceil(entryCount * SNACKS_THRESHOLD);
  const value = `${fmt(snacksSold, 0)} / ${fmt(targetSnacks, 0)} snacks`;
  const hint =
    snacksSold < targetSnacks
      ? `${fmt(targetSnacks - snacksSold, 0)} short · ${fmt(entryCount, 0)} visitors`
      : `${fmt(entryCount, 0)} visitors · ~1 per 2`;

  return { value, hint };
}

export function buildPanierContext(loc: LocationOverview): MetricContext {
  const { entryCount, salesNetIncVat, salesTicketNet } = loc;
  const avg = loc.panierMoyen.value;

  if (entryCount === null || entryCount <= 0) {
    return { value: avg !== null ? `${fmt(avg, 0)} ฿ / visitor` : "—", hint: "Enter visitors below" };
  }

  const value = avg !== null ? `${fmt(avg, 0)} / ${PANIER_THRESHOLD} ฿` : "—";
  const hint = "Per visitor, excl. tickets";

  if (salesNetIncVat !== null) {
    const productRevenue = salesNetIncVat - (salesTicketNet ?? 0);
    const targetRevenue = entryCount * PANIER_THRESHOLD;
    if (productRevenue < targetRevenue) {
      return { value, hint: `${fmt(targetRevenue - productRevenue, 0)} ฿ short` };
    }
  }

  return { value, hint };
}

export function buildOpexContext(loc: LocationOverview): MetricContext {
  const { opexSum, salesNetIncVat } = loc;
  const ratio = loc.opex.ratio;

  if (ratio === null || salesNetIncVat === null || salesNetIncVat <= 0 || opexSum === null) {
    return {
      value: ratio !== null ? `${(ratio * 100).toFixed(1)}%` : "—",
      hint: "Max 9.5% of sales",
    };
  }

  const maxSpend = Math.floor(salesNetIncVat * OPEX_THRESHOLD_DEFAULT);
  const value = `${fmt(opexSum, 0)} / ${fmt(maxSpend, 0)} ฿`;
  const hint =
    opexSum > maxSpend
      ? `${(ratio * 100).toFixed(1)}% · ${fmt(opexSum - maxSpend, 0)} ฿ over`
      : `${(ratio * 100).toFixed(1)}% · max 9.5%`;

  return { value, hint };
}

export function buildReviewVolumeContext(loc: LocationOverview): MetricContext {
  const { entryCount } = loc;
  const { count } = loc.reviews;

  if (entryCount === null || entryCount <= 0) {
    return { value: `${fmt(count, 0)} reviews`, hint: "Enter visitors below" };
  }

  const targetReviews = Math.ceil(entryCount * REVIEWS_VOLUME_THRESHOLD);
  const value = `${fmt(count, 0)} / ${fmt(targetReviews, 0)} reviews`;
  const hint =
    count < targetReviews
      ? `${fmt(targetReviews - count, 0)} more · 4 per 100 visitors`
      : "4 reviews per 100 visitors";

  return { value, hint };
}

export function buildReviewRatingContext(loc: LocationOverview): MetricContext {
  const { count, avgRating, currentRating, ratingTarget } = loc.reviews;

  if (count < REVIEWS_MIN_COUNT) {
    return {
      value: count > 0 ? `${avgRating.toFixed(1)} ★` : "—",
      hint: `${REVIEWS_MIN_COUNT - count} more reviews needed`,
    };
  }

  if (currentRating <= 0 || ratingTarget <= 0) {
    return { value: `${avgRating.toFixed(1)} ★`, hint: "Beat Google by 0.1★" };
  }

  const value = `${avgRating.toFixed(1)} / ${ratingTarget.toFixed(1)} ★`;
  const hint =
    avgRating < ratingTarget
      ? `Google: ${currentRating.toFixed(1)}★`
      : `Google: ${currentRating.toFixed(1)}★ · on target`;

  return { value, hint };
}

export type ViewMode = "internal" | "team";

export const VIEW_MODE_STORAGE_KEY = "challenges-view-mode";

export function defaultViewMode(isOwner: boolean): ViewMode {
  return isOwner ? "internal" : "team";
}
