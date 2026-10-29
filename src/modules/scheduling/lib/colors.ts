import { toMinutes } from "./math";

export type ShiftKind = "opening" | "daytime" | "closing" | "open-close" | "off" | "unscheduled" | "invalid";

export const KIND_LABELS: Record<ShiftKind, string> = {
  opening: "Opening",
  daytime: "Daytime",
  closing: "Closing",
  "open-close": "Open+Close",
  off: "OFF",
  unscheduled: "—",
  invalid: "Check",
};

/**
 * Defaults restrained to the accepted Operate palette (DESIGN.md): one muted
 * emerald accent, a neutral series and amber for closing — no saturated blue.
 * Users can still override any value in Scheduling → Settings (stored hex).
 */
export const PALETTE_DEFAULTS: Record<"opening" | "daytime" | "closing" | "off" | "unscheduled", string> = {
  opening: "#2c6f4c",
  daytime: "#55605a",
  closing: "#b45309",
  off: "#5f6b64",
  unscheduled: "#67726b",
};

export const EDITABLE_KINDS = [
  { key: "opening", label: "Opening" },
  { key: "daytime", label: "Daytime" },
  { key: "closing", label: "Closing" },
  { key: "off", label: "Day off" },
  { key: "unscheduled", label: "Unscheduled" },
] as const;

/** Partial hex overrides stored in scheduling_global_settings.palette. */
export type ShiftPalette = Partial<Record<ShiftKind, string>>;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/* ── Contrast helpers (presentation only) ───────────────────────────────────
   Cells sit on the card surface. In dark mode the light-mode hexes sit on a
   dark tint and drop to ~2–3:1, so the fg tone lightens toward white just
   enough to reach 4.5:1 against the tint the hue itself produces — kind hue
   identity is preserved. Light-mode behavior is unchanged (it already clears
   4.5:1 with the restrained defaults). */
const LIGHT_BACKDROP = "#ffffff";
const DARK_BACKDROP = "#1d2022"; // --ui-panel dark (the grid's bg-card)

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.slice(1);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function relLum([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return "#" + A.map((av, i) => Math.round(av * (1 - t) + B[i] * t))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

function contrastRatio(a: string, b: string): number {
  const la = relLum(hexToRgb(a));
  const lb = relLum(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Solid approximation of `color-mix(in srgb, hex 16%, backdrop)` — what the
 *  tint actually composites to over the card surface. */
function compositeTint(hex: string, dark: boolean): string {
  return mixHex(hex, dark ? DARK_BACKDROP : LIGHT_BACKDROP, 0.84);
}

/** Lighten the kind hue toward white just enough to hit the target contrast
 *  against the (already tinted) backdrop. */
function fgForContrast(hex: string, dark: boolean, target = 4.5): string {
  const solid = compositeTint(hex, dark);
  if (contrastRatio(hex, solid) >= target) return hex;
  for (let w = 2; w <= 94; w += 2) {
    const cand = mixHex(hex, "#ffffff", w / 100);
    if (contrastRatio(cand, solid) >= target) return cand;
  }
  return "#eef1ef";
}

/** Same, for text rendered directly on the card surface (no tint). */
function fgForBackdrop(hex: string, dark: boolean, target = 4.5): string {
  const backdrop = dark ? DARK_BACKDROP : LIGHT_BACKDROP;
  if (contrastRatio(hex, backdrop) >= target) return hex;
  for (let w = 2; w <= 94; w += 2) {
    const cand = mixHex(hex, "#ffffff", w / 100);
    if (contrastRatio(cand, backdrop) >= target) return cand;
  }
  return "#eef1ef";
}

function styleFor(kind: ShiftKind, hex: string, dark: boolean): { bg: string; fg: string; label: string } {
  // Light mode keeps the accepted behavior verbatim (raw hex, overrides
  // respected as stored). Dark mode applies the contrast treatment: OFF
  // renders on the bare card (transparent bg) → contrast against the panel;
  // other kinds render on their own 16% tint → contrast vs the composite.
  const fg = dark
    ? kind === "off"
      ? fgForBackdrop(hex, true)
      : fgForContrast(hex, true)
    : hex;
  if (kind === "off") return { bg: "transparent", fg, label: KIND_LABELS[kind] };
  return { bg: `color-mix(in srgb, ${hex} 16%, transparent)`, fg, label: KIND_LABELS[kind] };
}

/** Build bg/fg styles from palette overrides (missing/invalid → defaults).
 *  `dark` switches text tones to contrast-safe lightened variants against the
 *  dark card surface; omit it for the unchanged light behavior. */
export function paletteToStyles(
  palette: ShiftPalette,
  dark = false,
): Record<ShiftKind, { bg: string; fg: string; label: string }> {
  const valid = (v: unknown): v is string => typeof v === "string" && HEX_RE.test(v);
  const closing = valid(palette.closing) ? (palette.closing as string) : PALETTE_DEFAULTS.closing;
  const hexFor = (kind: ShiftKind): string => {
    if (valid(palette[kind])) return palette[kind] as string;
    if (kind === "open-close") return closing;
    if (kind === "invalid") return dark ? "#f0938a" : "#dc2626";
    return (PALETTE_DEFAULTS as Record<string, string>)[kind] ?? "#64748b";
  };
  return {
    opening: styleFor("opening", hexFor("opening"), dark),
    daytime: styleFor("daytime", hexFor("daytime"), dark),
    closing: styleFor("closing", hexFor("closing"), dark),
    "open-close": styleFor("open-close", hexFor("open-close"), dark),
    off: styleFor("off", hexFor("off"), dark),
    unscheduled: styleFor("unscheduled", hexFor("unscheduled"), dark),
    invalid: styleFor("invalid", hexFor("invalid"), dark),
  };
}

/** Default styles (no overrides). */
export const SHIFT_KIND_STYLES = paletteToStyles({});

export interface ColorInput {
  start: string;
  end: string;
  isOff?: boolean;
  openingTime?: string;
  closingTime?: string;
  openWindowMin?: number; // start within X min of opening → opening (default 60)
  closeWindowMin?: number; // end within X min of closing → closing (default 60)
}

/**
 * Derive shift color kind from hours + branch config.
 * - OFF/empty+isOff → off; empty+!isOff → unscheduled
 * - invalid (bad format, end<=start) → invalid
 * - touches both open and close windows → open-close (rendered as closing)
 */
export function classifyShift(c: ColorInput): ShiftKind {
  if (!c.start && !c.end) return c.isOff ? "off" : "unscheduled";
  if (!c.start || !c.end) return "invalid";
  const open = c.openingTime ?? "07:00";
  const close = c.closingTime ?? "21:30";
  const openWin = c.openWindowMin ?? 60;
  const closeWin = c.closeWindowMin ?? 60;
  let s: number, e: number, o: number, cl: number;
  try {
    s = toMinutes(c.start);
    e = toMinutes(c.end);
    o = toMinutes(open);
    cl = toMinutes(close);
  } catch {
    return "invalid";
  }
  if (!(e > s)) return "invalid";
  const isOpen = s - o <= openWin && s - o >= -openWin;
  const isClose = cl - e <= closeWin && cl - e >= -closeWin;
  if (isOpen && isClose) return "open-close";
  if (isOpen) return "opening";
  if (isClose) return "closing";
  return "daytime";
}
