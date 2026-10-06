import { describe, expect, it } from "vitest";
import {
  bangkokDateOf,
  detectDayShiftAnomalies,
  shiftDurationHours,
  shouldPreferSnapshot,
} from "./shift-anomalies";

// Karon 22-23 Sept 2026 case: day shift 09:04 -> 20:45 (Bangkok), then an
// overnight shift opened right at closing time, closed next day 20:53.
const DAY_SHIFT = {
  id: "s1",
  opened_at: "2026-09-22T02:04:00.000Z", // 09:04 Bangkok
  closed_at: "2026-09-22T13:45:00.000Z", // 20:45 Bangkok
  payments: [{ payment_type_id: "cash", money_amount: 10000 }],
};

const OVERNIGHT_SHIFT = {
  id: "s2",
  opened_at: "2026-09-22T13:45:00.000Z", // 22/09 20:45 Bangkok
  closed_at: "2026-09-23T13:53:00.000Z", // 23/09 20:53 Bangkok
  payments: [{ payment_type_id: "cash", money_amount: 12000 }],
};

describe("bangkokDateOf", () => {
  it("maps UTC instants to Bangkok civil dates", () => {
    expect(bangkokDateOf("2026-09-22T02:04:00.000Z")).toBe("2026-09-22");
    expect(bangkokDateOf("2026-09-22T13:45:00.000Z")).toBe("2026-09-22");
    expect(bangkokDateOf("2026-09-23T13:53:00.000Z")).toBe("2026-09-23");
    expect(bangkokDateOf(null)).toBeNull();
  });
});

describe("detectDayShiftAnomalies — Karon case", () => {
  it("sees no anomaly for a clean single-day shift", () => {
    const a = detectDayShiftAnomalies([DAY_SHIFT], "2026-09-22");
    expect(a.hasAnomaly).toBe(false);
    expect(a.warning).toBeNull();
  });

  it("flags the overnight reopen (spans midnight, back-to-back, ~24h)", () => {
    const a = detectDayShiftAnomalies([DAY_SHIFT, OVERNIGHT_SHIFT], "2026-09-22");
    expect(a.hasOvernight).toBe(true);
    expect(a.hasBackToBack).toBe(true);
    expect(a.hasExcessiveDuration).toBe(true);
    expect(a.hasAnomaly).toBe(true);
    expect(a.warning).toContain("22/09");
    expect(a.warning).toContain("23/09");
    expect(shiftDurationHours(OVERNIGHT_SHIFT)).toBeCloseTo(24.13, 1);
  });

  it("flags an overnight shift even on its own", () => {
    const a = detectDayShiftAnomalies([OVERNIGHT_SHIFT], "2026-09-22");
    expect(a.hasOvernight).toBe(true);
    expect(a.hasAnomaly).toBe(true);
  });
});

describe("shouldPreferSnapshot", () => {
  it("prefers shift figures on clean days, snapshot on anomalous days", () => {
    expect(shouldPreferSnapshot([DAY_SHIFT], "2026-09-22")).toBe(false);
    expect(shouldPreferSnapshot([DAY_SHIFT, OVERNIGHT_SHIFT], "2026-09-22")).toBe(true);
    expect(shouldPreferSnapshot([], "2026-09-22")).toBe(true);
  });
});
