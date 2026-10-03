import { describe, expect, it } from "vitest";
import { buildRecurringCostBreakdowns, recurringMonthKey, type RecurringCostRuleRow } from "./recurring-costs";

const baseRule: RecurringCostRuleRow = {
  id: "rent-a",
  location_id: "a",
  category: "rent",
  scope_type: "location",
  cadence: "monthly",
  estimated_amount: 30_000,
  effective_from: "2026-01-01",
  effective_to: null,
};

describe("recurring cost breakdowns", () => {
  it("keeps recurring costs separated by shop and category", () => {
    const result = buildRecurringCostBreakdowns({
      periods: [{ year: 2026, month: 9 }],
      locationIds: ["a", "b"],
      rules: [
        baseRule,
        { ...baseRule, id: "support-a", category: "support_workers", estimated_amount: 4_000 },
        { ...baseRule, id: "rent-b", location_id: "b", estimated_amount: 15_000 },
      ],
      overrides: [],
    });
    expect(result.get(recurringMonthKey("a", 2026, 9))).toMatchObject({ rent: 30_000, supportWorkers: 4_000 });
    expect(result.get(recurringMonthKey("b", 2026, 9))).toMatchObject({ rent: 15_000, supportWorkers: 0 });
  });

  it("uses the monthly override and respects effective dates", () => {
    const result = buildRecurringCostBreakdowns({
      periods: [{ year: 2026, month: 8 }, { year: 2026, month: 9 }],
      locationIds: ["a"],
      rules: [{ ...baseRule, effective_from: "2026-09-01" }],
      overrides: [{ cost_rule_id: "rent-a", service_from: "2026-09-01", service_to: "2026-09-30", amount: 31_000 }],
    });
    expect(result.has(recurringMonthKey("a", 2026, 8))).toBe(false);
    expect(result.get(recurringMonthKey("a", 2026, 9))?.rent).toBe(31_000);
  });
});
