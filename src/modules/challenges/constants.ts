/** Shared challenge thresholds and bonus amounts — used by API, UI, and team copy. */

export const MERCH_TIERS = [
  { threshold: 0.09, bonus: 5000 },
  { threshold: 0.08, bonus: 3000 },
  { threshold: 0.07, bonus: 1500 },
] as const;

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
  pattaya: 900_000,
  "chiang mai": 900_000,
  phangan: 700_000,
};

export function normalizeLocationKey(title: string): string {
  return title.replace(/^Capybara Coffee\s*/i, "").trim().toLowerCase();
}

export function computeRatingTarget(currentRating: number): number {
  if (currentRating <= 0) return 0;
  return Math.min(4.5, Math.round((currentRating + 0.1) * 10) / 10);
}
