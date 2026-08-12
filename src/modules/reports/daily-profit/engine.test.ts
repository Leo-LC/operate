import { describe, expect, it } from "vitest";
import { calculateDailyProfit, inclusiveDays, monthDays } from "./engine";
import type { EngineInput, FinanceLocation, FinanceShopMonthlyInput } from "./types";

const locations: FinanceLocation[] = [
  { id: "a", name: "A", legalEntityId: null, operationalStartDate: "2024-01-01" },
  { id: "b", name: "B", legalEntityId: null, operationalStartDate: "2024-01-01" },
];

const januaryInput: FinanceShopMonthlyInput = {
  id: "input-a", location_id: "a", period_year: 2024, period_month: 1,
  salaries_amount: 31_000, rent_amount: 15_500, electricity_amount: 3_100,
  water_amount: 1_550, other_fixed_amount: 850, service_charge_rate_pct: 1, employee_count: 3,
};

function input(overrides: Partial<EngineInput> = {}): EngineInput {
  return { from: "2024-01-01", to: "2024-01-31", selectedLocationIds: ["a"], locations, entries: [], monthlyInputs: [januaryInput], ...overrides };
}

describe("Daily P&L simplified engine", () => {
  it("uses calendar days and handles leap years", () => {
    expect(inclusiveDays("2024-02-01", "2024-02-29")).toBe(29);
    expect(monthDays(2024, 2)).toBe(29);
    expect(monthDays(2025, 2)).toBe(28);
  });

  it("prorates salaries and fixed costs over every day in the month", () => {
    const result = calculateDailyProfit(input({ to: "2024-01-10" }));
    const days = Array.from(result.dailyByLocation.get("a")!.values());
    expect(days.reduce((sum, day) => sum + day.payroll, 0)).toBeCloseTo(10_000);
    expect(days.reduce((sum, day) => sum + day.recurringCosts, 0)).toBeCloseTo((21_000 / 31) * 10);
  });

  it("calculates service charge from daily revenue, rate and employee count", () => {
    const result = calculateDailyProfit(input({
      from: "2024-01-05", to: "2024-01-05",
      entries: [{ locationId: "a", date: "2024-01-05", revenue: 10_000, vat: 0, directExpenses: 1_000, hrCash: 9_999, cashIn: 10_000 }],
    }));
    const day = result.dailyByLocation.get("a")!.get("2024-01-05")!;
    expect(day.serviceCharge).toBe(300);
    expect(day.economicProfit).toBeCloseTo(10_000 - 1_000 - 1_000 - (21_000 / 31) - 300);
  });

  it("never includes Sheet HR fields in economic profit", () => {
    const baseline = calculateDailyProfit(input({
      from: "2024-01-05", to: "2024-01-05", monthlyInputs: [],
      entries: [{ locationId: "a", date: "2024-01-05", revenue: 5_000, vat: 0, directExpenses: 500, hrCash: 0, cashIn: 5_000 }],
    })).dailyByLocation.get("a")!.get("2024-01-05")!;
    const withHrCash = calculateDailyProfit(input({
      from: "2024-01-05", to: "2024-01-05", monthlyInputs: [],
      entries: [{ locationId: "a", date: "2024-01-05", revenue: 5_000, vat: 0, directExpenses: 500, hrCash: 100_000, cashIn: 5_000 }],
    })).dailyByLocation.get("a")!.get("2024-01-05")!;
    expect(withHrCash.economicProfit).toBe(baseline.economicProfit);
    expect(withHrCash.cashOut).toBe(100_500);
  });

  it("keeps global consolidation equal to the sum of shops", () => {
    const second = { ...januaryInput, id: "input-b", location_id: "b", salaries_amount: 15_500, employee_count: 2 };
    const result = calculateDailyProfit(input({
      selectedLocationIds: ["a", "b"], monthlyInputs: [januaryInput, second],
      entries: [
        { locationId: "a", date: "2024-01-01", revenue: 3_000, vat: 0, directExpenses: 200, hrCash: 0, cashIn: 3_000 },
        { locationId: "b", date: "2024-01-01", revenue: 7_000, vat: 0, directExpenses: 400, hrCash: 0, cashIn: 7_000 },
      ],
    }));
    const shopProfit = ["a", "b"].reduce((total, locationId) => total + Array.from(result.dailyByLocation.get(locationId)!.values()).reduce((sum, day) => sum + day.economicProfit, 0), 0);
    const allProfit = Array.from(result.dailyByLocation.values()).flatMap((days) => Array.from(days.values())).reduce((sum, day) => sum + day.economicProfit, 0);
    expect(allProfit).toBeCloseTo(shopProfit);
  });
});
