import { describe, it, expect } from "vitest";
import { calcPayroll, calcServiceCharge, liveSalaryShare } from "./hr";

describe("calcServiceCharge", () => {
  it("computes revenue share", () => {
    expect(calcServiceCharge(100000, 1, 5)).toBe(5000);
  });

  it("returns 0 for invalid inputs", () => {
    expect(calcServiceCharge(0, 1, 5)).toBe(0);
    expect(calcServiceCharge(100000, 0, 5)).toBe(0);
  });
});

describe("calcPayroll", () => {
  it("sums components", () => {
    expect(calcPayroll(30000, 1500, 500)).toBe(32000);
  });
});

describe("liveSalaryShare", () => {
  const emp = {
    base_salary_monthly: 30000,
    service_charge_pct: 2,
    service_charge_eligible: true,
    location_id: "shop-a",
    employee_locations: null,
  };

  it("returns base + service charge from revenue-to-date", () => {
    expect(liveSalaryShare(emp, "shop-a", 200000, 1)).toEqual({
      base: 30000,
      serviceCharge: 4000,
      eligible: true,
    });
  });

  it("falls back to the shop default pct when the employee has none", () => {
    expect(liveSalaryShare({ ...emp, service_charge_pct: null }, "shop-a", 200000, 1)).toEqual({
      base: 30000,
      serviceCharge: 2000,
      eligible: true,
    });
  });

  it("returns null when the employee is not assigned to the shop", () => {
    expect(liveSalaryShare(emp, "shop-b", 200000, 1)).toBeNull();
  });

  it("prefers the per-shop assignment salary and eligibility", () => {
    const multi = {
      ...emp,
      employee_locations: [{ location_id: "shop-b", base_salary_monthly: 25000, service_charge_eligible: false }],
    };
    expect(liveSalaryShare(multi, "shop-b", 200000, 1)).toEqual({
      base: 25000,
      serviceCharge: 0,
      eligible: false,
    });
    // global flag alone also disables the charge
    expect(
      liveSalaryShare({ ...emp, service_charge_eligible: false }, "shop-a", 200000, 1)?.serviceCharge,
    ).toBe(0);
  });
});
