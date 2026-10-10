import { describe, it, expect } from "vitest";
import { formatWeekLabel } from "./WeekPicker";
import { formatWeekTitle } from "./WeekExportCard";

describe("formatWeekLabel", () => {
  it("same month", () => {
    expect(formatWeekLabel("2026-10-05")).toBe("5 – 11 Oct 2026");
  });
  it("split across two months", () => {
    expect(formatWeekLabel("2026-09-28")).toBe("28 Sept – 4 Oct 2026");
  });
  it("split across two years", () => {
    expect(formatWeekLabel("2025-12-29")).toBe("29 Dec 2025 – 4 Jan 2026");
  });
  it("falls back to raw input", () => {
    expect(formatWeekLabel("nope")).toBe("nope");
  });
});

describe("formatWeekTitle", () => {
  it("uses long month names", () => {
    expect(formatWeekTitle("2026-10-05")).toBe("Week of 5 – 11 October 2026");
    expect(formatWeekTitle("2026-09-28")).toBe("Week of 28 September – 4 October 2026");
  });
});
