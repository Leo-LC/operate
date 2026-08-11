import { describe, expect, it } from "vitest";
import { allocationWeights, calculateDailyProfit, inclusiveDays, periodsForRule } from "./engine";
import type { EngineInput, FinanceCostRule, FinanceLocation } from "./types";

const locations: FinanceLocation[] = [
  { id: "a", name: "A", legalEntityId: "company", operationalStartDate: "2024-01-01" },
  { id: "b", name: "B", legalEntityId: "company", operationalStartDate: "2024-01-01" },
];

const baseRule: FinanceCostRule = {
  id: "rent", organization_id: "org", label: "Rent", category: "rent", scope_type: "location",
  legal_entity_id: null, location_id: "a", cadence: "monthly", estimated_amount: 3100,
  effective_from: "2024-01-01", effective_to: null, allocation_method: "direct", custom_allocations: {},
  is_active: true, notes: null,
};

describe("Daily P&L engine", () => {
  it("uses calendar-day accrual and handles leap years", () => {
    expect(inclusiveDays("2024-02-01", "2024-02-29")).toBe(29);
    expect(inclusiveDays("2025-02-01", "2025-02-28")).toBe(28);
  });

  it("prorates a monthly estimate over a partial range", () => {
    const input: EngineInput = {
      from: "2024-01-01", to: "2024-01-10", selectedLocationIds: ["a"], locations,
      entries: [], payroll: [], costRules: [baseRule], costActuals: [], adjustments: [],
    };
    const result = calculateDailyProfit(input);
    const days = Array.from(result.dailyByLocation.get("a")!.values());
    expect(days).toHaveLength(10);
    expect(days.reduce((sum, day) => sum + day.recurringCosts, 0)).toBeCloseTo(1000, 6);
    expect(days.every((day) => day.status === "estimated")).toBe(true);
  });

  it("replaces an estimate with the actual for the whole service period", () => {
    const periods = periodsForRule(baseRule, [{ id: "actual", cost_rule_id: "rent", service_from: "2024-01-01", service_to: "2024-01-31", amount: 6200, paid_on: "2024-01-05" }], "2024-01-01", "2024-01-31");
    expect(periods).toHaveLength(1);
    expect(periods[0].amount).toBe(6200);
    expect(periods[0].status).toBe("actual");
  });

  it("normalizes custom allocation weights to 100 percent", () => {
    const weights = allocationWeights({ ...baseRule, scope_type: "entity", location_id: null, legal_entity_id: "company", allocation_method: "custom", custom_allocations: { a: 30, b: 70 } }, locations, new Map());
    expect(weights.get("a")).toBeCloseTo(.3);
    expect(weights.get("b")).toBeCloseTo(.7);
    expect(Array.from(weights.values()).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });

  it("falls back to equal allocation when revenue is zero", () => {
    const weights = allocationWeights({ ...baseRule, scope_type: "entity", location_id: null, legal_entity_id: "company", allocation_method: "revenue" }, locations, new Map([["a", 0], ["b", 0]]));
    expect(weights.get("a")).toBe(.5);
    expect(weights.get("b")).toBe(.5);
  });

  it("keeps payroll economic accrual separate from HR cash", () => {
    const result = calculateDailyProfit({
      from: "2024-01-01", to: "2024-01-31", selectedLocationIds: ["a"], locations,
      entries: [{ locationId: "a", date: "2024-01-05", revenue: 10000, vat: 0, directExpenses: 1000, hrCash: 5000, cashIn: 10000 }],
      payroll: [{ locationId: "a", year: 2024, month: 1, amount: 31000, status: "actual" }],
      costRules: [], costActuals: [], adjustments: [],
    });
    const days = Array.from(result.dailyByLocation.get("a")!.values());
    expect(days.reduce((sum, day) => sum + day.payroll, 0)).toBeCloseTo(31000);
    expect(days.reduce((sum, day) => sum + day.cashOut, 0)).toBe(6000);
    expect(days.reduce((sum, day) => sum + day.economicProfit, 0)).toBeCloseTo(-22000);
  });

  it("preserves consolidation across allocated shops", () => {
    const result = calculateDailyProfit({
      from: "2024-01-01", to: "2024-01-31", selectedLocationIds: ["a", "b"], locations,
      entries: [
        { locationId: "a", date: "2024-01-01", revenue: 3000, vat: 0, directExpenses: 0, hrCash: 0, cashIn: 3000 },
        { locationId: "b", date: "2024-01-01", revenue: 7000, vat: 0, directExpenses: 0, hrCash: 0, cashIn: 7000 },
      ], payroll: [], costActuals: [], adjustments: [],
      costRules: [{ ...baseRule, scope_type: "entity", location_id: null, legal_entity_id: "company", allocation_method: "revenue", estimated_amount: 1000 }],
    });
    const a = Array.from(result.dailyByLocation.get("a")!.values()).reduce((sum, day) => sum + day.recurringCosts, 0);
    const b = Array.from(result.dailyByLocation.get("b")!.values()).reduce((sum, day) => sum + day.recurringCosts, 0);
    expect(a).toBeCloseTo(300);
    expect(b).toBeCloseTo(700);
    expect(a + b).toBeCloseTo(1000);
  });
});
