// Detection of incoherent Loyverse shifts (e.g. shift closed then immediately
// reopened for the next day, spanning midnight).
//
// Context: GET /shifts filters on OPENED time (created_at_min/max). A shift
// opened 22 Sept 20:45 and closed 23 Sept 20:53 is therefore archived under
// date=22, but its payments/sales belong (mostly) to the 23rd. Showing those
// shift payments under the 22nd — or under both days — silently corrupts the
// accounting export (correct sales from receipts, duplicated/wrong payments).
//
// These helpers are pure and Bangkok-aware (shops run on Asia/Bangkok).

export type ShiftLike = Record<string, unknown>;

const BKK_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const BKK_DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "2026-09-22T13:45:00.000Z" -> "2026-09-22" (Bangkok civil date). Null when unparsable. */
export function bangkokDateOf(iso: unknown): string | null {
  if (typeof iso !== "string" || !iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return BKK_FMT.format(d); // en-CA => YYYY-MM-DD
}

/** Short Bangkok rendering for warnings ("22/09 20:45"). */
export function formatBangkokShort(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const parts = BKK_DATETIME_FMT.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")} ${get("hour")}:${get("minute")}`;
}

function shiftTime(s: ShiftLike, key: string): string | null {
  const v = s[key];
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return v;
}

/** Duration in hours between opened_at and closed_at. Null when open shift or unparsable. */
export function shiftDurationHours(s: ShiftLike): number | null {
  const opened = shiftTime(s, "opened_at");
  const closed = shiftTime(s, "closed_at");
  if (!opened || !closed) return null;
  const ms = new Date(closed).getTime() - new Date(opened).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 3_600_000;
}

export const OVERNIGHT_DUPLICATE_NOTE =
  "Shift à cheval sur 2 jours — paiements/caisse affichés depuis les reçus (snapshot), pas depuis le shift.";

export type DayShiftAnomaly = {
  /** At least one shift spans midnight (opened_bkk != closed_bkk) or is still open from a previous day. */
  hasOvernight: boolean;
  /** At least one shift lasts longer than the threshold (default 18h). */
  hasExcessiveDuration: boolean;
  /** A shift was closed then reopened within `backToBackMinutes` (default 10 min) — the Karon pattern. */
  hasBackToBack: boolean;
  /** A shift archived under this date was actually opened on another Bangkok day. */
  hasOpenedOnOtherDay: boolean;
  hasAnomaly: boolean;
  /** Human-readable warning (French), null when clean. Shown in Shift & Sales + Export. */
  warning: string | null;
  details: {
    overnightCount: number;
    excessiveCount: number;
    backToBackCount: number;
    openedOnOtherDayCount: number;
    maxDurationHours: number | null;
  };
};

export function detectDayShiftAnomalies(
  shifts: ShiftLike[],
  date: string,
  opts?: { excessiveHours?: number; backToBackMinutes?: number },
): DayShiftAnomaly {
  const excessiveHours = opts?.excessiveHours ?? 18;
  const backToBackMinutes = opts?.backToBackMinutes ?? 10;

  let overnightCount = 0;
  let excessiveCount = 0;
  let openedOnOtherDayCount = 0;
  let maxDurationHours: number | null = null;
  let firstOvernight: ShiftLike | null = null;

  for (const s of shifts) {
    const opened = shiftTime(s, "opened_at");
    const closed = shiftTime(s, "closed_at");
    const openedBkk = bangkokDateOf(opened);
    const closedBkk = bangkokDateOf(closed);
    if (openedBkk && openedBkk !== date) openedOnOtherDayCount++;
    if (openedBkk && closedBkk && openedBkk !== closedBkk) {
      overnightCount++;
      if (!firstOvernight) firstOvernight = s;
    } else if (openedBkk && !closedBkk && openedBkk !== date) {
      // still-open shift carried over from a previous day
      overnightCount++;
      if (!firstOvernight) firstOvernight = s;
    }
    const dur = shiftDurationHours(s);
    if (dur !== null) {
      if (maxDurationHours === null || dur > maxDurationHours) maxDurationHours = dur;
      if (dur > excessiveHours) excessiveCount++;
    }
  }

  // back-to-back: sorted by opened_at, next opens ~immediately after prev closes
  let backToBackCount = 0;
  const ordered = shifts
    .map((s) => ({ s, opened: shiftTime(s, "opened_at"), closed: shiftTime(s, "closed_at") }))
    .filter((x) => x.opened && x.closed)
    .sort((a, b) => new Date(a.opened as string).getTime() - new Date(b.opened as string).getTime());
  for (let i = 1; i < ordered.length; i++) {
    const gapMs = new Date(ordered[i]!.opened as string).getTime() - new Date(ordered[i - 1]!.closed as string).getTime();
    if (Number.isFinite(gapMs) && gapMs >= 0 && gapMs <= backToBackMinutes * 60_000) backToBackCount++;
  }

  const hasOvernight = overnightCount > 0;
  const hasExcessiveDuration = excessiveCount > 0;
  const hasBackToBack = backToBackCount > 0;
  const hasOpenedOnOtherDay = openedOnOtherDayCount > 0;
  const hasAnomaly = hasOvernight || hasExcessiveDuration || hasOpenedOnOtherDay;

  let warning: string | null = null;
  if (hasAnomaly && firstOvernight) {
    const o = formatBangkokShort((firstOvernight as ShiftLike)["opened_at"]);
    const c = formatBangkokShort((firstOvernight as ShiftLike)["closed_at"]);
    const dur = shiftDurationHours(firstOvernight);
    const durTxt = dur !== null ? ` (~${Math.round(dur)}h)` : "";
    warning =
      `Shift incohérent ouvert le ${o}, fermé le ${c}${durTxt} — ` +
      `vérifiez la fermeture en caisse. ${OVERNIGHT_DUPLICATE_NOTE}`;
    if (hasBackToBack) warning += " (fermeture immédiatement rouverte : le lendemain a probablement son propre shift manquant)";
  } else if (hasAnomaly) {
    warning = `Shift incohérent détecté. ${OVERNIGHT_DUPLICATE_NOTE}`;
  }

  return {
    hasOvernight,
    hasExcessiveDuration,
    hasBackToBack,
    hasOpenedOnOtherDay,
    hasAnomaly,
    warning,
    details: {
      overnightCount,
      excessiveCount,
      backToBackCount,
      openedOnOtherDayCount,
      maxDurationHours,
    },
  };
}

/**
 * When a day's shifts are incoherent (midnight-spanning), shift payments/VAT
 * mix two calendar days — the receipt-based snapshot is the trustworthy source.
 */
export function shouldPreferSnapshot(shifts: ShiftLike[], date: string): boolean {
  if (shifts.length === 0) return true;
  return detectDayShiftAnomalies(shifts, date).hasAnomaly;
}
