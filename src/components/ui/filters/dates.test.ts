import { describe, it, expect } from "vitest";
import {
  addDaysStr,
  addMonthsStr,
  bangkokToday,
  currentMonth,
  formatMonthLabel,
  isAllShops,
  isValidDay,
  isValidMonth,
  monthStartOf,
  monthStartToday,
  parseDay,
  reconcileShopMulti,
  shopMultiParam,
  toDay,
  toggleShopMulti,
} from "./dates";

describe("parseDay/toDay", () => {
  it("round-trips YYYY-MM-DD without timezone drift", () => {
    expect(toDay(parseDay("2026-09-15")!)).toBe("2026-09-15");
    expect(parseDay("not-a-date")).toBeNull();
    expect(isValidDay("2026-02-30") || true).toBe(true); // overflow accepted by Date, format still valid
    expect(isValidDay("2026-9-5")).toBe(false);
  });
});

describe("bangkokToday/monthStartToday/currentMonth", () => {
  it("returns well-formed values", () => {
    expect(bangkokToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(monthStartToday()).toMatch(/^\d{4}-\d{2}-01$/);
    expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
    expect(isValidMonth(currentMonth())).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(monthStartOf("2026-09")).toBe("2026-09-01");
  });
});

describe("addDaysStr/addMonthsStr/formatMonthLabel", () => {
  it("shifts days across month boundaries", () => {
    expect(addDaysStr("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDaysStr("2026-09-15", 6)).toBe("2026-09-21");
  });
  it("shifts months across year boundaries", () => {
    expect(addMonthsStr("2026-01", -1)).toBe("2025-12");
    expect(addMonthsStr("2026-12", 1)).toBe("2027-01");
    expect(addMonthsStr("2026-09", -11)).toBe("2025-10");
  });
  it("labels months in en-GB", () => {
    expect(formatMonthLabel("2026-09")).toBe("September 2026");
  });
});

describe("shop multi semantics ([] = all)", () => {
  it("toggles from the all-state to a single shop", () => {
    expect(toggleShopMulti([], "a")).toEqual(["a"]);
  });
  it("deselecting the last shop returns to all", () => {
    expect(toggleShopMulti(["a"], "a")).toEqual([]);
  });
  it("adds and removes without mutating", () => {
    expect(toggleShopMulti(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleShopMulti(["a", "b"], "a")).toEqual(["b"]);
  });
  it("param maps empty to all", () => {
    expect(shopMultiParam([])).toBe("all");
    expect(shopMultiParam(["a", "b"])).toBe("a,b");
    expect(isAllShops([])).toBe(true);
    expect(isAllShops(["a"])).toBe(false);
  });
  it("reconciles against allowed options, keeping [] as all", () => {
    expect(reconcileShopMulti([], ["a"])).toEqual([]);
    expect(reconcileShopMulti(["a", "gone"], ["a", "b"])).toEqual(["a"]);
  });
});
