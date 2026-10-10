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

/** Default hex colors (editable in Scheduling → Settings). */
export const PALETTE_DEFAULTS: Record<"opening" | "daytime" | "closing" | "off" | "unscheduled", string> = {
  opening: "#16a34a",
  daytime: "#2563eb",
  closing: "#ea580c",
  off: "#64748b",
  unscheduled: "#94a3b8",
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

function styleFor(kind: ShiftKind, hex: string): { bg: string; fg: string; label: string } {
  if (kind === "off") return { bg: "transparent", fg: hex, label: KIND_LABELS[kind] };
  return { bg: `color-mix(in srgb, ${hex} 16%, transparent)`, fg: hex, label: KIND_LABELS[kind] };
}

/** Build bg/fg styles from palette overrides (missing/invalid → defaults). */
export function paletteToStyles(palette: ShiftPalette): Record<ShiftKind, { bg: string; fg: string; label: string }> {
  const valid = (v: unknown): v is string => typeof v === "string" && HEX_RE.test(v);
  const closing = valid(palette.closing) ? (palette.closing as string) : PALETTE_DEFAULTS.closing;
  const hexFor = (kind: ShiftKind): string => {
    if (valid(palette[kind])) return palette[kind] as string;
    if (kind === "open-close") return closing;
    if (kind === "invalid") return "#dc2626";
    return (PALETTE_DEFAULTS as Record<string, string>)[kind] ?? "#64748b";
  };
  return {
    opening: styleFor("opening", hexFor("opening")),
    daytime: styleFor("daytime", hexFor("daytime")),
    closing: styleFor("closing", hexFor("closing")),
    "open-close": styleFor("open-close", hexFor("open-close")),
    off: styleFor("off", hexFor("off")),
    unscheduled: styleFor("unscheduled", hexFor("unscheduled")),
    invalid: styleFor("invalid", hexFor("invalid")),
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
