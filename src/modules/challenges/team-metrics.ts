import type { LucideIcon } from "lucide-react";
import {
  Coffee,
  Leaf,
  Shirt,
  Cookie,
  Star,
  StarHalf,
} from "lucide-react";
import type { LocationOverview } from "@/modules/challenges/overview-data";
import {
  MERCH_TIERS,
  SNACKS_THRESHOLD,
  PANIER_THRESHOLD,
  OPEX_THRESHOLD_DEFAULT,
  REVIEWS_VOLUME_THRESHOLD,
  REVIEWS_MIN_COUNT,
} from "./constants";

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export interface TeamMetricRow {
  id: string;
  letter: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  current: string;
  currentPasses: boolean | null;
  target: string;
  gapPrimary: string;
  gapSecondary?: string;
  gapPasses: boolean | null;
  adviceTip: string;
  achievedTip: string;
}

const ADVICE_TIPS = {
  merch: "Highlight merch at the counter and suggest add-ons with each order.",
  snacks: "Suggest a snack with each drink order.",
  spend: "Recommend larger sizes or combo deals to boost average spend.",
  opex: "Review stock orders and reduce waste to keep costs under control.",
  reviews: "Ask happy customers to leave a Google review before they leave.",
  rating: "Focus on consistency — every great experience helps lift the average.",
} as const;

const ACHIEVED_TIPS = {
  merch: "Great job! Merch target achieved.",
  snacks: "Great job! Snack target achieved.",
  spend: "Great job! Spend target achieved.",
  opex: "Great job! Costs are under control.",
  reviews: "Great job! Review target achieved.",
  rating: "Great job! Rating target achieved.",
} as const;

function buildMerchMetric(loc: LocationOverview): TeamMetricRow {
  const { ratio, tier } = loc.merchandising;
  const sales = loc.salesNetIncVat;
  const goodies = loc.salesGoodiesNet;
  const passes = tier > 0 ? true : ratio !== null ? false : null;
  const targetPct = 7;

  let current = "—";
  let gapPrimary = "—";
  let gapSecondary: string | undefined;
  let gapPasses: boolean | null = null;

  if (ratio !== null) {
    current = `${(ratio * 100).toFixed(1)}%`;
    if (passes === true) {
      gapPrimary = "Target achieved";
      gapPasses = true;
    } else if (sales !== null && sales > 0) {
      const ptsGap = targetPct - ratio * 100;
      const merchNeeded = Math.ceil(sales * MERCH_TIERS[2].threshold - (goodies ?? 0));
      gapPrimary = `+${ptsGap.toFixed(1)} pts`;
      gapSecondary = `About ฿${fmt(Math.max(0, merchNeeded), 0)} more merch sales needed`;
      gapPasses = false;
    }
  }

  return {
    id: "merch",
    letter: "A",
    label: "Merchandise sales",
    subtitle: "% of sales from merchandise",
    icon: Shirt,
    current,
    currentPasses: passes,
    target: `${targetPct}%`,
    gapPrimary,
    gapSecondary,
    gapPasses,
    adviceTip: ADVICE_TIPS.merch,
    achievedTip: ACHIEVED_TIPS.merch,
  };
}

function buildSnacksMetric(loc: LocationOverview): TeamMetricRow {
  const { entryCount, snacksSold } = loc;
  const passes = loc.snacks.passes;
  const targetPer100 = Math.round(SNACKS_THRESHOLD * 100);

  let current = "—";
  let gapPrimary = "—";
  let gapSecondary: string | undefined;
  let gapPasses: boolean | null = null;

  if (entryCount !== null && entryCount > 0 && snacksSold !== null) {
    const per100 = Math.round((snacksSold / entryCount) * 100);
    current = `${per100}/100`;
    if (passes === true) {
      gapPrimary = "Target achieved";
      gapPasses = true;
    } else {
      const targetSnacks = Math.ceil(entryCount * SNACKS_THRESHOLD);
      const short = targetSnacks - snacksSold;
      gapPrimary = `${fmt(short, 0)} more snacks`;
      gapSecondary = `Target: ${targetPer100} per 100 visits`;
      gapPasses = false;
    }
  } else if (entryCount === null || entryCount <= 0) {
    gapSecondary = "Visitor count needed";
  }

  return {
    id: "snacks",
    letter: "B",
    label: "Snack sales",
    subtitle: "Snacks per 100 visits",
    icon: Cookie,
    current,
    currentPasses: passes,
    target: `${targetPer100}/100`,
    gapPrimary,
    gapSecondary,
    gapPasses,
    adviceTip: ADVICE_TIPS.snacks,
    achievedTip: ACHIEVED_TIPS.snacks,
  };
}

function buildSpendMetric(loc: LocationOverview): TeamMetricRow {
  const avg = loc.panierMoyen.value;
  const passes = loc.panierMoyen.passes;
  const { entryCount, salesNetIncVat, salesTicketNet } = loc;

  let current = "—";
  let gapPrimary = "—";
  let gapSecondary: string | undefined;
  let gapPasses: boolean | null = null;

  if (avg !== null) {
    current = `฿${fmt(avg, 0)}`;
    if (passes === true) {
      gapPrimary = "Target achieved";
      gapPasses = true;
    } else {
      const perVisitorGap = PANIER_THRESHOLD - avg;
      gapPrimary = `฿${fmt(Math.ceil(perVisitorGap), 0)} more per visitor`;
      if (entryCount !== null && entryCount > 0 && salesNetIncVat !== null) {
        const productRevenue = salesNetIncVat - (salesTicketNet ?? 0);
        const targetRevenue = entryCount * PANIER_THRESHOLD;
        if (productRevenue < targetRevenue) {
          gapSecondary = `About ฿${fmt(targetRevenue - productRevenue, 0)} more product revenue needed`;
        }
      }
      gapPasses = false;
    }
  }

  return {
    id: "spend",
    letter: "C",
    label: "Average spend per visitor",
    subtitle: "Product revenue per visitor (excl. tickets)",
    icon: Coffee,
    current,
    currentPasses: passes,
    target: `฿${PANIER_THRESHOLD}`,
    gapPrimary,
    gapSecondary,
    gapPasses,
    adviceTip: ADVICE_TIPS.spend,
    achievedTip: ACHIEVED_TIPS.spend,
  };
}

function buildOpexMetric(loc: LocationOverview): TeamMetricRow {
  const ratio = loc.opex.ratio;
  const passes = loc.opex.passes;
  const { opexSum, salesNetIncVat } = loc;
  const targetPct = OPEX_THRESHOLD_DEFAULT * 100;

  let current = "—";
  let gapPrimary = "—";
  let gapSecondary: string | undefined;
  let gapPasses: boolean | null = null;

  if (ratio !== null) {
    current = `${(ratio * 100).toFixed(1)}%`;
    if (passes === true) {
      gapPrimary = "Target achieved";
      gapPasses = true;
    } else if (salesNetIncVat !== null && opexSum !== null) {
      const maxSpend = Math.floor(salesNetIncVat * OPEX_THRESHOLD_DEFAULT);
      const over = opexSum - maxSpend;
      const ptsOver = ratio * 100 - targetPct;
      gapPrimary = `+${ptsOver.toFixed(1)} pts over`;
      gapSecondary = `About ฿${fmt(over, 0)} over budget`;
      gapPasses = false;
    }
  }

  return {
    id: "opex",
    letter: "D",
    label: "Running costs",
    subtitle: "Stock costs as % of sales",
    icon: Leaf,
    current,
    currentPasses: passes,
    target: `< ${targetPct}%`,
    gapPrimary,
    gapSecondary,
    gapPasses,
    adviceTip: ADVICE_TIPS.opex,
    achievedTip: ACHIEVED_TIPS.opex,
  };
}

function buildReviewVolumeMetric(loc: LocationOverview): TeamMetricRow {
  const { entryCount } = loc;
  const { count } = loc.reviews;
  const passes = loc.reviews.volumePass;
  const targetPer100 = Math.round(REVIEWS_VOLUME_THRESHOLD * 100);

  let current = "—";
  let gapPrimary = "—";
  let gapSecondary: string | undefined;
  let gapPasses: boolean | null = null;

  if (entryCount !== null && entryCount > 0) {
    const per100 = ((count / entryCount) * 100).toFixed(1);
    current = `${per100}/100`;
    if (passes === true) {
      gapPrimary = "Target achieved";
      gapPasses = true;
    } else {
      const targetReviews = Math.ceil(entryCount * REVIEWS_VOLUME_THRESHOLD);
      gapPrimary = `${fmt(targetReviews - count, 0)} more reviews`;
      gapSecondary = `Target: ${targetPer100} per 100 visitors`;
      gapPasses = false;
    }
  } else {
    current = `${fmt(count, 0)} reviews`;
    gapSecondary = "Visitor count needed";
  }

  return {
    id: "reviews",
    letter: "E",
    label: "Google reviews",
    subtitle: "New reviews per 100 visitors",
    icon: Star,
    current,
    currentPasses: passes,
    target: `${targetPer100}/100`,
    gapPrimary,
    gapSecondary,
    gapPasses,
    adviceTip: ADVICE_TIPS.reviews,
    achievedTip: ACHIEVED_TIPS.reviews,
  };
}

function buildReviewRatingMetric(loc: LocationOverview): TeamMetricRow {
  const { count, avgRating, currentRating, ratingTarget } = loc.reviews;
  const passes = loc.reviews.ratingPass;

  let current = "—";
  let target = "—";
  let gapPrimary = "—";
  let gapSecondary: string | undefined;
  let gapPasses: boolean | null = null;

  if (count > 0) {
    current = `${avgRating.toFixed(1)}★`;
  }

  if (currentRating > 0 && ratingTarget > 0) {
    target = `${ratingTarget.toFixed(1)}★`;
  } else {
    target = "Google +0.1★";
  }

  if (count < REVIEWS_MIN_COUNT) {
    gapPrimary = `${REVIEWS_MIN_COUNT - count} more reviews needed`;
    gapSecondary = `Min ${REVIEWS_MIN_COUNT} reviews this month`;
    gapPasses = false;
  } else if (passes === true) {
    gapPrimary = "Target achieved";
    gapPasses = true;
  } else if (count > 0 && ratingTarget > 0) {
    const gap = ratingTarget - avgRating;
    gapPrimary = `${gap.toFixed(1)}★ below target`;
    gapSecondary = currentRating > 0 ? `Google baseline: ${currentRating.toFixed(1)}★` : undefined;
    gapPasses = false;
  }

  return {
    id: "rating",
    letter: "F",
    label: "Review rating",
    subtitle: "Average rating this month",
    icon: StarHalf,
    current,
    currentPasses: passes,
    target,
    gapPrimary,
    gapSecondary,
    gapPasses,
    adviceTip: ADVICE_TIPS.rating,
    achievedTip: ACHIEVED_TIPS.rating,
  };
}

export function buildTeamMetrics(loc: LocationOverview): TeamMetricRow[] {
  return [
    buildMerchMetric(loc),
    buildSnacksMetric(loc),
    buildSpendMetric(loc),
    buildOpexMetric(loc),
    buildReviewVolumeMetric(loc),
    buildReviewRatingMetric(loc),
  ];
}

export function shortLocationName(title: string): string {
  return title.replace(/^Capybara Coffee\s*/i, "").trim() || title;
}
