import { describe, it, expect } from "vitest";
import { displayDays, dateLabel } from "./AnnualGridClient";
import { autoColon, isValidTimeLoose, normTime, parseShiftValue } from "../lib/time-input";

describe("displayDays (full Mon–Sun weeks)", () => {
  it("pads October 2026 (starts Thu, ends Sat) to Mon Sep 28 – Sun Nov 1", () => {
    const days = displayDays("2026-10");
    expect(days[0]).toBe("2026-09-28"); // Monday
    expect(days[days.length - 1]).toBe("2026-11-01"); // Sunday
    expect(days).toContain("2026-10-01");
    expect(days).toContain("2026-10-31");
    expect(days.length % 7).toBe(0);
  });
  it("needs no padding when the month starts on Monday", () => {
    // June 2026 starts on a Monday
    const days = displayDays("2026-06");
    expect(days[0]).toBe("2026-06-01");
    expect(days[days.length - 1]).toBe("2026-07-05"); // June ends Tue Jun 30 → Sun Jul 5
  });
});

describe("dateLabel (no duplicated weekday)", () => {
  it("shows weekday once", () => {
    expect(dateLabel("2026-10-01").text).toBe("Thu 1 Oct");
    expect(dateLabel("2026-10-02").text).toBe("Fri 2");
    expect(dateLabel("2026-10-12").text).toBe("Mon 12 Oct");
    expect(dateLabel("2026-10-12").isMonday).toBe(true);
    expect(dateLabel("2026-10-13").isMonday).toBe(false);
  });
});

describe("time input (auto colon)", () => {
  it("formats digit-only input", () => {
    expect(autoColon("0700")).toBe("07:00");
    expect(autoColon("700")).toBe("7:00");
    expect(autoColon("2130")).toBe("21:30");
    expect(autoColon("07:00")).toBe("07:00");
    expect(autoColon("07")).toBe("07");
  });
  it("fixes the intermediate colon state while typing (1800, not 1:800)", () => {
    expect(autoColon("180")).toBe("1:80");
    expect(autoColon("1:800")).toBe("18:00");
    expect(autoColon("1800")).toBe("18:00");
    // Partial edits with a colon are left alone (backspacing "18:0")
    expect(autoColon("18:0")).toBe("18:0");
  });
  it("validates loosely then normalizes", () => {
    expect(isValidTimeLoose("7:00")).toBe(true);
    expect(isValidTimeLoose("07:00")).toBe(true);
    expect(isValidTimeLoose("24:00")).toBe(false);
    expect(isValidTimeLoose("07:0")).toBe(false);
    expect(normTime("7:00")).toBe("07:00");
    expect(normTime("12:30")).toBe("12:30");
  });
});

describe("parseShiftValue", () => {
  it("parses ranges with optional colons", () => {
    expect(parseShiftValue("07:00-16:00")).toEqual({ start: "07:00", end: "16:00", isOff: false });
    expect(parseShiftValue("0700-1600")).toEqual({ start: "07:00", end: "16:00", isOff: false });
  });
  it("handles OFF and clear", () => {
    expect(parseShiftValue("OFF")).toEqual({ start: "", end: "", isOff: true });
    expect(parseShiftValue("o")).toEqual({ start: "", end: "", isOff: true });
    expect(parseShiftValue("")).toBe("clear");
    expect(parseShiftValue("   ")).toBe("clear");
  });
  it("rejects garbage", () => {
    expect(parseShiftValue("hello")).toBeNull();
    expect(parseShiftValue("07:00")).toBeNull();
    expect(parseShiftValue("25:00-26:00")).toBeNull();
  });
});
