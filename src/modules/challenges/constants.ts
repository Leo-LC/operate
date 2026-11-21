/** Shared challenge thresholds and bonus amounts — used by API, UI, and team copy. */

export const MERCH_TIERS = [
  { threshold: 0.09, bonus: 5000 },
  { threshold: 0.08, bonus: 3000 },
  { threshold: 0.07, bonus: 1500 },
] as const;

/** Merch bonus by tier index (0 = below all tiers). Index matches `merchTier` in overview-data. */
export const MERCH_BONUS_BY_TIER = [0, MERCH_TIERS[2].bonus, MERCH_TIERS[1].bonus, MERCH_TIERS[0].bonus] as const;

/**
 * Sales-target (CA) multiplier on the merch bonus — new rule from Nov 2026.
 * The tier bonus ("montant prévu") is scaled by how much of the sales target
 * the shop reached: < 50% → no bonus · 50–75% → half · ≥ 75% → full.
 */
export const MERCH_CA_TIERS = [
  { minRatio: 0.75, multiplier: 1 },
  { minRatio: 0.5, multiplier: 0.5 },
] as const;

/** First month ("YYYY-MM") the CA multiplier applies. Earlier months keep the old rule (full bonus). */
export const MERCH_CA_RULE_START_MONTH = "2026-11";

/**
 * Multiplier applied to the merch tier bonus for `month`.
 * `revenueRatio` = actual CA / sales target (null = no target configured → not gated).
 */
export function merchCaMultiplier(revenueRatio: number | null, month: string | undefined): number {
  if (!month || month < MERCH_CA_RULE_START_MONTH) return 1;
  if (revenueRatio === null) return 1;
  for (const tier of MERCH_CA_TIERS) {
    if (revenueRatio >= tier.minRatio) return tier.multiplier;
  }
  return 0;
}

export const SNACKS_THRESHOLD = 0.45;
export const SNACKS_BONUS = 1250;
export const PANIER_THRESHOLD = 190;
export const PANIER_BONUS = 1250;
export const OPEX_THRESHOLD_DEFAULT = 0.095;
export const OPEX_BONUS = 1250;
export const REVIEWS_VOLUME_THRESHOLD = 0.04;
export const REVIEWS_VOLUME_BONUS = 625;
export const REVIEWS_RATING_BONUS = 625;
export const REVIEWS_MIN_COUNT = 10;

/** Monthly net revenue (incl. VAT) a shop must reach to unlock gated challenges. */
export const REVENUE_THRESHOLDS: Record<string, number> = {
  samui: 1_200_000,
  ekkamai: 1_200_000,
  silom: 1_200_000,
  laguna: 1_200_000,
  pattaya: 900_000,
  "chiang mai": 900_000,
  karon: 1_000_000,
  phangan: 700_000,
};

export function normalizeLocationKey(title: string): string {
  return title.replace(/^Capybara Coffee\s*/i, "").trim().toLowerCase();
}

export function computeRatingTarget(currentRating: number): number {
  if (currentRating <= 0) return 0;
  return Math.min(4.5, Math.round((currentRating + 0.1) * 10) / 10);
}
