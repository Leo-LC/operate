/**
 * Shared time-input helpers for the Scheduling + Weekly editors.
 * Times are "HH:MM" (Bangkok wall clock). No overnight shifts.
 */

/** Live-format time typing: "0700" → "07:00". Tolerates the intermediate
 *  colon state so incremental typing lands correctly ("180" → "1:80" →
 *  typing "0" gives "1:800" → normalized to "18:00", never "1:800"). */
export function autoColon(v: string): string {
  if (v.includes(":")) {
    const digits = v.replace(/\D/g, "");
    // Only reformat a complete 4-digit input; leave partial edits alone
    // (e.g. "18:0" while backspacing must not jump).
    if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    return v;
  }
  const digits = v.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `${digits[0]}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

export function isValidTimeLoose(v: string): boolean {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

export function normTime(v: string): string {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return v;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/**
 * Parse a committed shift value: "" (clear), "OFF"/"O" (day off),
 * "HH:MM-HH:MM" (range, colons optional). Returns null when invalid.
 */
export function parseShiftValue(
  raw: string,
): { start: string; end: string; isOff: boolean } | "clear" | null {
  const v = raw.trim().toUpperCase();
  if (v === "") return "clear";
  if (v === "OFF" || v === "O") return { start: "", end: "", isOff: true };
  const m = v.match(/^(\d{1,2}:?\d{2})\s*[-–]\s*(\d{1,2}:?\d{2})$/);
  if (!m) return null;
  const start = normTime(autoColon(m[1]));
  const end = normTime(autoColon(m[2]));
  if (!isValidTimeLoose(start) || !isValidTimeLoose(end)) return null;
  return { start, end, isOff: false };
}
