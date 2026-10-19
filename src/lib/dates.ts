// Bangkok (UTC+7) calendar helpers, shared by the nightly pipeline and cron routes.
//
// The "+7h, then read the UTC calendar date" trick is intentional: Thailand has no
// DST, so it is exact, allocation-light, and free of timezone database lookups.
// Several modules historically shipped their own copy of these helpers (loyverse
// sync, Admin panels); new code should import from here.

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86400000;

/** Bangkok (UTC+7) calendar day of any instant, as `YYYY-MM-DD`. */
export function toBangkokDate(date: Date): string {
  return new Date(date.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

export function bangkokNow(): Date {
  return new Date(Date.now() + BKK_OFFSET_MS);
}

/** Today's Bangkok calendar date (YYYY-MM-DD). */
export function bangkokToday(): string {
  return toBangkokDate(new Date());
}

/** Bangkok date `days` from today (negative = in the past). */
export function bangkokOffsetDate(days: number): string {
  return toBangkokDate(new Date(Date.now() + days * DAY_MS));
}

/** Yesterday's Bangkok calendar date (YYYY-MM-DD). */
export function bangkokYesterday(): string {
  return bangkokOffsetDate(-1);
}

/** The last `count` Bangkok dates, today first, descending (YYYY-MM-DD[]). */
export function bangkokDates(count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(bangkokOffsetDate(-i));
  return out;
}

/** Current Bangkok month (YYYY-MM). */
export function bangkokMonth(): string {
  return bangkokToday().slice(0, 7);
}

/** Month before the given YYYY-MM, wrapping to December of the previous year. */
export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}
