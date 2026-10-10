/** Pure scheduling math — no Supabase, no TZ. Times are "HH:MM" (Bangkok wall clock).
 *  No overnight shifts (owner-confirmed, 07:00–21:30): end <= start is invalid.
 */

export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(t: string): boolean {
  return TIME_RE.test(t);
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Net working hours for one shift. Returns 0 for OFF/empty. */
export function computeShiftHours(start: string, end: string, breakMinutes = 30): number {
  if (!start || !end) return 0;
  if (!isValidTime(start) || !isValidTime(end)) return 0;
  const diff = toMinutes(end) - toMinutes(start);
  if (diff <= 0) return 0;
  const net = diff - Math.max(0, breakMinutes);
  return Number((Math.max(0, net) / 60).toFixed(2));
}

export interface DayCell {
  start: string; // "" = OFF / unscheduled
  end: string;
  breakMinutes?: number;
}

/** Sum hours over a list of cells (week, month, arbitrary range). */
export function sumHours(cells: DayCell[], defaultBreak = 30): number {
  let total = 0;
  for (const c of cells) total += computeShiftHours(c.start, c.end, c.breakMinutes ?? defaultBreak);
  return Number(total.toFixed(2));
}

/** Monday of the week containing `day` (YYYY-MM-DD). Pure string math, no TZ. */
export function mondayOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // Mon=0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

export function addDaysStr(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function weekDaysOf(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysStr(monday, i));
}

/** "59:30" style total used in the Google Sheets sample (H:MM, hours can exceed 24). */
export function formatTotalHours(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
