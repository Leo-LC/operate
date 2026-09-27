import { describe, it, expect } from "vitest";
import {
  computeEndOfMonthTotals,
  formatMonthLabel,
  latestSafePerShop,
  mapRecurringCategory,
  monthBounds,
  shortShopName,
  type EndOfMonthCategory,
} from "./endOfMonth";

describe("monthBounds", () => {
  it("covers the full calendar month", () => {
    expect(monthBounds(2026, 9)).toEqual({ start: "2026-09-01", end: "2026-09-30", nextMonthStart: "2026-10-01" });
    expect(monthBounds(2026, 2)).toEqual({ start: "2026-02-01", end: "2026-02-28", nextMonthStart: "2026-03-01" });
    expect(monthBounds(2026, 12)).toEqual({ start: "2026-12-01", end: "2026-12-31", nextMonthStart: "2027-01-01" });
  });
});

describe("formatMonthLabel", () => {
  it("labels in French", () => {
    expect(formatMonthLabel(2026, 9)).toBe("Septembre 2026");
  });
});

describe("shortShopName", () => {
  it("strips the brand prefix", () => {
    expect(shortShopName("Capybara Coffee Ekkamai")).toBe("Ekkamai");
    expect(shortShopName("Silom")).toBe("Silom");
  });
});

describe("mapRecurringCategory", () => {
  it("maps known slugs to Boss buckets", () => {
    expect(mapRecurringCategory("rent")).toBe("loyers");
    expect(mapRecurringCategory("loyer_local")).toBe("loyers");
    expect(mapRecurringCategory("marketing")).toBe("marketing");
    expect(mapRecurringCategory("supplier_makro")).toBe("fournisseurs");
    expect(mapRecurringCategory("utilities")).toBe("autres");
    expect(mapRecurringCategory("support_workers")).toBe("autres");
    expect(mapRecurringCategory("other")).toBe("autres");
  });
});

describe("latestSafePerShop", () => {
  const locations = [
    { id: "a", name: "Capybara Coffee Ekkamai" },
    { id: "b", name: "Capybara Coffee Silom" },
  ];
  it("picks the latest entry per shop and flags shops without entries", () => {
    const safes = latestSafePerShop(
      [
        { location_id: "a", entry_date: "2026-09-01", cash_safe: 80000 },
        { location_id: "a", entry_date: "2026-09-30", cash_safe: 82500 },
      ],
      locations,
    );
    expect(safes).toEqual([
      { locationId: "a", name: "Capybara Coffee Ekkamai", amount: 82500, missing: false },
      { locationId: "b", name: "Capybara Coffee Silom", amount: null, missing: true },
    ]);
  });
});

describe("computeEndOfMonthTotals", () => {
  const finalized = (label: string, total: number): EndOfMonthCategory => ({
    key: "loyers",
    label,
    total,
    finalized: true,
    paymentCount: 1,
    lines: [],
  });
  const safes = [
    { locationId: "a", name: "Ekkamai", amount: 100000, missing: false },
    { locationId: "b", name: "Silom", amount: 50000, missing: false },
  ];

  it("computes remaining as cash minus take-out when complete", () => {
    const t = computeEndOfMonthTotals(safes, [finalized("Loyers", 90000), finalized("Marketing", 10000)]);
    expect(t).toMatchObject({ cash: 150000, takeOut: 100000, remaining: 50000, complete: true });
  });

  it("keeps remaining null (never partial) when a safe is missing", () => {
    const t = computeEndOfMonthTotals(
      [...safes, { locationId: "c", name: "Capybara Coffee Karon", amount: null, missing: true }],
      [finalized("Loyers", 90000)],
    );
    expect(t.remaining).toBeNull();
    expect(t.complete).toBe(false);
    expect(t.cash).toBe(150000);
    expect(t.missingSafeShops).toEqual(["Karon"]);
  });

  it("keeps remaining null when a category is not finalized", () => {
    const t = computeEndOfMonthTotals(safes, [
      finalized("Loyers", 90000),
      { key: "salaires", label: "Salaires", total: null, finalized: false, paymentCount: 0, lines: [] },
    ]);
    expect(t.remaining).toBeNull();
    expect(t.takeOut).toBe(90000);
    expect(t.unfinalizedCategories).toEqual(["Salaires"]);
  });
});
