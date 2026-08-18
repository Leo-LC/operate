import { addMonths, addYears, format, parseISO } from "date-fns";

function cleanDates(dates: string[]): string[] {
  return dates
    .map((d) => d.trim())
    .filter(Boolean)
    .sort();
}

/** Most recent vaccination date, or null when there are none. */
export function lastVaccinationDate(dates: string[]): string | null {
  const sorted = cleanDates(dates);
  return sorted.length ? sorted[sorted.length - 1] : null;
}

/**
 * Suggested next vaccination date:
 * - single vaccine  → one month later (booster)
 * - multiple        → one year after the latest
 * Returns null when there are no vaccine dates.
 */
export function suggestNextVaccine(dates: string[]): string | null {
  const sorted = cleanDates(dates);
  if (sorted.length === 0) return null;
  const latest = parseISO(sorted[sorted.length - 1]);
  const next = sorted.length === 1 ? addMonths(latest, 1) : addYears(latest, 1);
  return format(next, "yyyy-MM-dd");
}