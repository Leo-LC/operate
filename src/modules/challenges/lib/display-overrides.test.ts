import { describe, expect, it } from "vitest";
import {
  applyDisplayOverrides,
  type DisplayOverrideInput,
} from "./display-overrides";
import type { LocationOverview } from "@/modules/challenges/overview-data";

function baseLoc(): LocationOverview {
  return {
    locationId: "shop-1",
    locationTitle: "Capybara Coffee Test",
    salesNetIncVat: 1_200_000,
    salesGoodiesNet: 60_000,
    salesTicketNet: 200_000,
    opexSum: 100_000,
    entryCount: 1000,
    snacksSold: 400,
    entryCountP1: 300,
    entryCountP2: 300,
    entryCountP3: 400,
    snacksSoldP1: 100,
    snacksSoldP2: 150,
    snacksSoldP3: 150,
    revenue: { amount: 1_200_000, threshold: 1_200_000, unlocked: true, ratio: 1 },
    merchandising: { ratio: 0.05, tier: 0, bonus: 0 },
    snacks: { ratio: 0.4, passes: false, bonus: 0 },
    panierMoyen: { value: 1000, passes: true, bonus: 1250 },
    opex: { ratio: 100_000 / 1_200_000, passes: true, threshold: 0.095, bonus: 1250 },
    reviews: {
      count: 50,
      avgRating: 4.6,
      currentRating: 4.5,
      totalReviewCount: 500,
      ratingTarget: 4.5,
      volumeRatio: 0.05,
      volumePass: true,
      ratingPass: true,
      volumeBonus: 625,
      ratingBonus: 625,
    },
    totalBonus: 1250 + 1250 + 625 + 625,
  };
}

describe("applyDisplayOverrides", () => {
  it("returns source untouched when no overrides", () => {
    const source = baseLoc();
    const { loc, hasOverride } = applyDisplayOverrides(source, {});
    expect(hasOverride).toBe(false);
    expect(loc).toBe(source);
  });

  it("does not mutate the source object", () => {
    const source = baseLoc();
    const before = JSON.stringify(source);
    applyDisplayOverrides(source, { merch_ratio: 0.09 });
    expect(JSON.stringify(source)).toBe(before);
  });

  it("merch override recomputes tier + bonus (never gated)", () => {
    const { loc, adjusted, hasOverride } = applyDisplayOverrides(baseLoc(), {
      merch_ratio: 0.095,
    } as DisplayOverrideInput);
    expect(hasOverride).toBe(true);
    expect(loc.merchandising.tier).toBe(3);
    expect(loc.merchandising.bonus).toBe(5000);
    expect(adjusted.merch_ratio).toEqual({ real: 0.05, display: 0.095 });
  });

  it("sales override below target locks gated bonuses", () => {
    const { loc, adjusted } = applyDisplayOverrides(baseLoc(), {
      sales_amount: 500_000,
    } as DisplayOverrideInput);
    expect(loc.revenue.unlocked).toBe(false);
    expect(loc.revenue.ratio).toBeCloseTo(500_000 / 1_200_000);
    // Panier still passes on its value, but the bonus is locked out.
    expect(loc.panierMoyen.passes).toBe(true);
    expect(loc.panierMoyen.bonus).toBe(0);
    expect(loc.reviews.volumeBonus).toBe(0);
    // Merch stays paid — never gated.
    expect(loc.merchandising.bonus).toBe(0);
    expect(adjusted.sales_amount?.real).toBe(1_200_000);
  });

  it("rating override recomputes pass + bonus", () => {
    const { loc } = applyDisplayOverrides(baseLoc(), {
      review_rating_avg: 4.0,
    } as DisplayOverrideInput);
    expect(loc.reviews.avgRating).toBe(4.0);
    expect(loc.reviews.ratingPass).toBe(false);
    expect(loc.reviews.ratingBonus).toBe(0);
  });

  it("totalBonus is the sum of display bonuses", () => {
    const { loc } = applyDisplayOverrides(baseLoc(), {
      merch_ratio: 0.07,
      snacks_ratio: 0.5,
    } as DisplayOverrideInput);
    // merch tier 1 (1500) + snacks pass (1250) + panier (1250) + opex (1250) + reviews (625+625)
    expect(loc.totalBonus).toBe(1500 + 1250 + 1250 + 1250 + 625 + 625);
  });
});
