import { describe, it, expect } from "vitest";
import { computeCashTotal, isValidCounts } from "./denominations";

describe("computeCashTotal", () => {
  it("sums notes and coins", () => {
    expect(computeCashTotal({ "1000": 2, "20": 3, "10": 1, "1": 4 })).toBe(2074);
  });

  it("ignores unknown keys and non-positive qtys", () => {
    expect(computeCashTotal({ "100": 1, "9999": 5, "50": 0, "20": -2 })).toBe(100);
  });

  it("returns 0 for empty counts", () => {
    expect(computeCashTotal({})).toBe(0);
  });
});

describe("isValidCounts", () => {
  it("accepts valid counts", () => {
    expect(isValidCounts({ "1000": 1, "1": 0 })).toBe(true);
    expect(isValidCounts({})).toBe(true);
  });

  it("rejects unknown denominations and bad qtys", () => {
    expect(isValidCounts({ "9999": 1 })).toBe(false);
    expect(isValidCounts({ "100": -1 })).toBe(false);
    expect(isValidCounts({ "100": 1.5 })).toBe(false);
    expect(isValidCounts(null)).toBe(false);
    expect(isValidCounts([])).toBe(false);
  });
});
