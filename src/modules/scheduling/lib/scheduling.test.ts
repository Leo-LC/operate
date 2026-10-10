import { describe, it, expect } from "vitest";
import {
  computeShiftHours,
  sumHours,
  mondayOf,
  weekDaysOf,
  formatTotalHours,
  isValidTime,
} from "./math";
import { validateCell, validateStaffing } from "./validation";
import { classifyShift, paletteToStyles, PALETTE_DEFAULTS } from "./colors";

describe("scheduling math", () => {
  it("computes 9h shift minus 30min break = 8.5", () => {
    expect(computeShiftHours("07:00", "16:00", 30)).toBe(8.5);
    expect(computeShiftHours("12:30", "21:30", 30)).toBe(8.5);
    expect(computeShiftHours("09:00", "18:00", 30)).toBe(8.5);
  });
  it("returns 0 for OFF/empty", () => {
    expect(computeShiftHours("", "", 30)).toBe(0);
    expect(computeShiftHours("", "18:00", 30)).toBe(0);
  });
  it("returns 0 when end <= start (no overnight)", () => {
    expect(computeShiftHours("21:30", "07:00", 30)).toBe(0);
    expect(computeShiftHours("16:00", "16:00", 30)).toBe(0);
  });
  it("rejects bad formats", () => {
    expect(isValidTime("7:00")).toBe(false);
    expect(isValidTime("07:00")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
  });
  it("sums a week like the sample (7 x 8.5 = 59.5)", () => {
    const cells = Array.from({ length: 7 }, () => ({ start: "07:00", end: "16:00" }));
    expect(sumHours(cells)).toBe(59.5);
    expect(formatTotalHours(59.5)).toBe("59:30");
  });
  it("mondayOf + weekDaysOf", () => {
    expect(mondayOf("2026-10-14")).toBe("2026-10-12"); // Wed -> Mon
    expect(weekDaysOf("2026-10-12")).toHaveLength(7);
    expect(weekDaysOf("2026-10-12")[6]).toBe("2026-10-18");
  });
});

describe("validation", () => {
  it("flags half-filled as error", () => {
    const issues = validateCell({ employeeId: "e", date: "2026-10-12", start: "07:00", end: "" });
    expect(issues.some((i) => i.level === "error" && i.code === "half-filled")).toBe(true);
  });
  it("flags end<=start as error", () => {
    const issues = validateCell({ employeeId: "e", date: "2026-10-12", start: "16:00", end: "07:00" });
    expect(issues.some((i) => i.code === "end-before-start")).toBe(true);
  });
  it("flags outside branch hours", () => {
    const issues = validateCell({ employeeId: "e", date: "2026-10-12", start: "06:00", end: "16:00" });
    expect(issues.some((i) => i.code === "outside-hours")).toBe(true);
  });
  it("distinguishes OFF from unscheduled", () => {
    expect(validateCell({ employeeId: "e", date: "2026-10-12", start: "", end: "", isOff: true })).toHaveLength(0);
    const w = validateCell({ employeeId: "e", date: "2026-10-12", start: "", end: "" });
    expect(w.some((i) => i.code === "unscheduled" && i.level === "warning")).toBe(true);
  });
  it("warns on leave + understaffing", () => {
    expect(
      validateCell({ employeeId: "e", date: "2026-10-12", start: "07:00", end: "16:00", onTimeOff: true }).some(
        (i) => i.code === "on-leave",
      ),
    ).toBe(true);
    expect(
      validateStaffing([{ date: "2026-10-12", scheduledCount: 1, minRequired: 3 }]).some(
        (i) => i.code === "understaffed",
      ),
    ).toBe(true);
  });
});

describe("colors", () => {
  it("classifies sample shifts", () => {
    expect(classifyShift({ start: "07:00", end: "16:00" })).toBe("opening");
    expect(classifyShift({ start: "09:00", end: "18:00" })).toBe("daytime");
    expect(classifyShift({ start: "12:30", end: "21:30" })).toBe("closing");
    expect(classifyShift({ start: "", end: "", isOff: true })).toBe("off");
    expect(classifyShift({ start: "", end: "" })).toBe("unscheduled");
    expect(classifyShift({ start: "07:00", end: "21:30" })).toBe("open-close");
    expect(classifyShift({ start: "16:00", end: "07:00" })).toBe("invalid");
  });
  it("applies palette overrides, falls back to defaults", () => {
    expect(paletteToStyles({}).opening.fg).toBe(PALETTE_DEFAULTS.opening);
    expect(paletteToStyles({ opening: "#ff0000" }).opening.fg).toBe("#ff0000");
    expect(paletteToStyles({ opening: "#ff0000" }).opening.bg).toContain("#ff0000");
    expect(paletteToStyles({ opening: "nope" }).opening.fg).toBe(PALETTE_DEFAULTS.opening);
    // open-close follows closing when unset
    expect(paletteToStyles({ closing: "#00ff00" })["open-close"].fg).toBe("#00ff00");
    // off stays transparent
    expect(paletteToStyles({ off: "#111111" }).off.bg).toBe("transparent");
  });
});
