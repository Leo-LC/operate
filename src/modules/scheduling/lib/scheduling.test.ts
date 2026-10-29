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
  it("keeps light-mode tones and reaches 4.5:1 for dark-mode tones", () => {
    // Light mode: unchanged behavior (defaults pass as-is).
    expect(paletteToStyles({}).opening.fg).toBe(PALETTE_DEFAULTS.opening);
    expect(paletteToStyles({}).daytime.fg).toBe(PALETTE_DEFAULTS.daytime);

    const toRgb = (hex: string) =>
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const mix = (a: number[], b: number[], t: number) =>
      a.map((av, i) => Math.round(av * (1 - t) + b[i] * t));
    const toStr = (c: number[]) =>
      "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
    const lum = (c: number[]) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    const ratio = (fgHex: string, bgHex: string) => {
      const la = lum(toRgb(fgHex));
      const lb = lum(toRgb(bgHex));
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const panel = [29, 32, 34]; // #1d2022
    const dark = paletteToStyles({}, true);
    for (const kind of ["opening", "daytime", "closing", "invalid", "unscheduled"] as const) {
      const st = dark[kind];
      // Rendered result: the kind hue tinted 16% over the dark card.
      const hex = /#([0-9a-fA-F]{6})/.exec(st.bg)?.[1] ?? "#1d2022";
      const rendered = toStr(mix(toRgb("#" + hex), panel, 0.84));
      expect(ratio(st.fg, rendered)).toBeGreaterThanOrEqual(4.5);
      expect(st.fg.toLowerCase()).not.toBe(
        ((PALETTE_DEFAULTS as Record<string, string>)[kind] ?? "").toLowerCase(),
      );
    }
    // OFF sits directly on the dark card (transparent bg).
    expect(ratio(dark.off.fg, "#1d2022")).toBeGreaterThanOrEqual(4.5);
  });
});
