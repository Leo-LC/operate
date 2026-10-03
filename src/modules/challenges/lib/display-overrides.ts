import {
  MERCH_TIERS,
  SNACKS_THRESHOLD,
  SNACKS_BONUS,
  PANIER_THRESHOLD,
  PANIER_BONUS,
  OPEX_THRESHOLD_DEFAULT,
  OPEX_BONUS,
  REVIEWS_VOLUME_THRESHOLD,
  REVIEWS_VOLUME_BONUS,
  REVIEWS_RATING_BONUS,
  REVIEWS_MIN_COUNT,
} from "@/modules/challenges/constants";
import type { LocationOverview } from "@/modules/challenges/overview-data";

/**
 * Display-only overrides for challenge cards / printed PDFs.
 *
 * End-of-month print adjustments: the owner can tweak the FINAL displayed
 * numbers without touching any source of truth (Loyverse snapshots,
 * daily_entries, challenge_counters, reviews). Revert = delete the override.
 *
 * Values are stored raw in `LocationOverview` semantics:
 * - *_ratio as decimals (0.07 = 7%), panier_value / sales_amount in ฿,
 *   review_rating_avg in ★.
 */
export const DISPLAY_OVERRIDE_KEYS = [
  "sales_amount",
  "merch_ratio",
  "snacks_ratio",
  "panier_value",
  "opex_ratio",
  "review_volume_ratio",
  "review_rating_avg",
] as const;

export type DisplayOverrideKey = (typeof DISPLAY_OVERRIDE_KEYS)[number];

export interface DisplayOverrideRow {
  location_id: string;
  metric_key: DisplayOverrideKey;
  display_value: number;
}

export type DisplayOverrideInput = Partial<Record<DisplayOverrideKey, number>>;

export interface AdjustedMetric {
  real: number | null;
  display: number;
}

export interface AppliedDisplayOverrides {
  /** Location with display values patched in (statuses + bonuses recomputed). */
  loc: LocationOverview;
  /** Per-metric real vs display values — drives the "Adjusted" badge + revert. */
  adjusted: Partial<Record<DisplayOverrideKey, AdjustedMetric>>;
  hasOverride: boolean;
}

const MERCH_BONUS_BY_TIER = [0, 1500, 3000, 5000] as const;

function merchTierFor(ratio: number | null): 0 | 1 | 2 | 3 {
  if (ratio === null) return 0;
  if (ratio >= MERCH_TIERS[0].threshold) return 3;
  if (ratio >= MERCH_TIERS[1].threshold) return 2;
  if (ratio >= MERCH_TIERS[2].threshold) return 1;
  return 0;
}

export function isDisplayOverrideKey(key: string): key is DisplayOverrideKey {
  return (DISPLAY_OVERRIDE_KEYS as readonly string[]).includes(key);
}

/**
 * Pure overlay: returns a COPY of `source` with display values applied and
 * every derived status/bonus recomputed with the same thresholds as
 * `overview-data.ts`. `source` is never mutated.
 */
export function applyDisplayOverrides(
  source: LocationOverview,
  overrides: DisplayOverrideInput,
): AppliedDisplayOverrides {
  const adjusted: Partial<Record<DisplayOverrideKey, AdjustedMetric>> = {};
  const hasAny = DISPLAY_OVERRIDE_KEYS.some((k) => overrides[k] !== undefined);
  if (!hasAny) return { loc: source, adjusted, hasOverride: false };

  // Deep-ish copy of the mutable branches (enough for display patching).
  const loc: LocationOverview = {
    ...source,
    revenue: { ...source.revenue },
    merchandising: { ...source.merchandising },
    snacks: { ...source.snacks },
    panierMoyen: { ...source.panierMoyen },
    opex: { ...source.opex },
    reviews: { ...source.reviews },
  };

  const record = (key: DisplayOverrideKey, real: number | null, display: number) => {
    adjusted[key] = { real, display };
  };

  // 1. Sales first — gating (revenueLocked) depends on it.
  const salesOverride = overrides.sales_amount;
  if (salesOverride !== undefined) {
    record("sales_amount", loc.salesNetIncVat, salesOverride);
    loc.salesNetIncVat = salesOverride;
    loc.revenue.amount = salesOverride;
  }
  const threshold = loc.revenue.threshold;
  const revenueUnlocked =
    threshold === null
      ? true
      : loc.revenue.amount !== null && loc.revenue.amount >= threshold;
  loc.revenue.unlocked = threshold === null ? null : revenueUnlocked;
  loc.revenue.ratio =
    threshold !== null ? (loc.revenue.amount ?? 0) / threshold : null;
  const revenueLocked = threshold !== null && !revenueUnlocked;

  // 2. Merch % — the only metric NOT gated by the sales target.
  const merchOverride = overrides.merch_ratio;
  if (merchOverride !== undefined) {
    record("merch_ratio", loc.merchandising.ratio, merchOverride);
    loc.merchandising.ratio = merchOverride;
  }
  const merchTier = merchTierFor(loc.merchandising.ratio);
  loc.merchandising.tier = merchTier;
  loc.merchandising.bonus = MERCH_BONUS_BY_TIER[merchTier] as 0;

  // 3. Animal food.
  const snacksOverride = overrides.snacks_ratio;
  if (snacksOverride !== undefined) {
    record("snacks_ratio", loc.snacks.ratio, snacksOverride);
    loc.snacks.ratio = snacksOverride;
  }
  loc.snacks.passes =
    loc.snacks.ratio !== null ? loc.snacks.ratio >= SNACKS_THRESHOLD : null;
  loc.snacks.bonus = loc.snacks.passes === true && !revenueLocked ? SNACKS_BONUS : 0;

  // 4. Spend per visit.
  const panierOverride = overrides.panier_value;
  if (panierOverride !== undefined) {
    record("panier_value", loc.panierMoyen.value, panierOverride);
    loc.panierMoyen.value = panierOverride;
  }
  loc.panierMoyen.passes =
    loc.panierMoyen.value !== null ? loc.panierMoyen.value >= PANIER_THRESHOLD : null;
  loc.panierMoyen.bonus =
    loc.panierMoyen.passes === true && !revenueLocked ? PANIER_BONUS : 0;

  // 5. Running costs.
  const opexOverride = overrides.opex_ratio;
  if (opexOverride !== undefined) {
    record("opex_ratio", loc.opex.ratio, opexOverride);
    loc.opex.ratio = opexOverride;
  }
  loc.opex.passes =
    loc.opex.ratio !== null ? loc.opex.ratio < OPEX_THRESHOLD_DEFAULT : null;
  loc.opex.bonus = loc.opex.passes === true && !revenueLocked ? OPEX_BONUS : 0;

  // 6. Review volume.
  const volOverride = overrides.review_volume_ratio;
  if (volOverride !== undefined) {
    record("review_volume_ratio", loc.reviews.volumeRatio, volOverride);
    loc.reviews.volumeRatio = volOverride;
  }
  loc.reviews.volumePass =
    loc.reviews.volumeRatio !== null
      ? loc.reviews.volumeRatio >= REVIEWS_VOLUME_THRESHOLD
      : null;
  loc.reviews.volumeBonus =
    loc.reviews.volumePass === true && !revenueLocked ? REVIEWS_VOLUME_BONUS : 0;

  // 7. Review rating.
  const ratingOverride = overrides.review_rating_avg;
  if (ratingOverride !== undefined) {
    record("review_rating_avg", loc.reviews.avgRating, ratingOverride);
    loc.reviews.avgRating = ratingOverride;
  }
  const revCount = loc.reviews.count;
  const currentRating = loc.reviews.currentRating;
  const ratingTarget = loc.reviews.ratingTarget;
  loc.reviews.ratingPass =
    revCount >= REVIEWS_MIN_COUNT && currentRating > 0 && ratingTarget > 0
      ? loc.reviews.avgRating >= ratingTarget
      : null;
  loc.reviews.ratingBonus =
    loc.reviews.ratingPass === true && !revenueLocked ? REVIEWS_RATING_BONUS : 0;

  loc.totalBonus =
    (MERCH_BONUS_BY_TIER[loc.merchandising.tier] ?? 0) +
    loc.snacks.bonus +
    loc.panierMoyen.bonus +
    loc.opex.bonus +
    loc.reviews.volumeBonus +
    loc.reviews.ratingBonus;

  return { loc, adjusted, hasOverride: true };
}
