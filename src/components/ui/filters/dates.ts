import type { DateRangeValue } from "./types";

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** Parse `YYYY-MM-DD` to a local-midnight Date (avoids timezone drift). */
export function parseDay(value: string): Date | null {
  const match = DAY_RE.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function isValidDay(value: string): boolean {
  return parseDay(value) !== null;
}

/** Format a Date to `YYYY-MM-DD` (local time). */
export function toDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today in Asia/Bangkok as `YYYY-MM-DD`. */
export function bangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const o: Record<string, string> = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${o.year}-${o.month}-${o.day}`;
}

export function bangkokYesterday(): string {
  return addDaysStr(bangkokToday(), -1);
}

/** First day of the current month as `YYYY-MM-DD`. */
export function monthStartToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Current month as `YYYY-MM`. */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isValidMonth(value: string): boolean {
  if (!MONTH_RE.test(value)) return false;
  const m = Number(value.slice(5, 7));
  return m >= 1 && m <= 12;
}

/** `YYYY-MM` → `YYYY-MM-01`. */
export function monthStartOf(month: string): string {
  return `${month}-01`;
}

/** Add a day delta to a `YYYY-MM-DD` string. */
export function addDaysStr(dateStr: string, delta: number): string {
  const d = parseDay(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + delta);
  return toDay(d);
}

/** Add a month delta to a `YYYY-MM` string. */
export function addMonthsStr(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-09" → "September 2026" (en-GB). */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function isEmptyRange(range: DateRangeValue): boolean {
  return !range.from && !range.to;
}

// ── Shop multi-select helpers ────────────────────────────────────────────────
// Unified semantics: `[]` = all shops (cf. DailyProfitView). Never use
// "all ids in the array" to mean all — keep the array empty instead.

/** True when the multi selection means "all shops". */
export function isAllShops(selected: string[]): boolean {
  return selected.length === 0;
}

/** Toggle one shop in a multi selection (`[]` stays the "all" state). */
export function toggleShopMulti(selected: string[], id: string): string[] {
  if (selected.length === 0) return [id];
  if (selected.includes(id)) return selected.filter((s) => s !== id);
  return [...selected, id];
}

/** Query param for a multi selection: `"all"` or comma-joined ids. */
export function shopMultiParam(selected: string[]): string {
  return selected.length === 0 ? "all" : selected.join(",");
}

/** Reconcile a stored multi selection with the allowed options ([] = all kept). */
export function reconcileShopMulti(selected: string[], allowedIds: string[]): string[] {
  if (selected.length === 0) return selected;
  const allowed = new Set(allowedIds);
  return selected.filter((id) => allowed.has(id));
}
