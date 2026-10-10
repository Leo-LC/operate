import { isValidTime, toMinutes } from "./math";

export type IssueLevel = "error" | "warning";

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  message: string;
  employeeId?: string;
  date?: string;
}

export interface ValidateCellInput {
  employeeId: string;
  date: string;
  start: string; // "" = OFF / empty
  end: string;
  /** true = confirmed day off, false/undefined = empty unscheduled cell */
  isOff?: boolean;
  openingTime?: string; // branch hours, default 07:00
  closingTime?: string; // default 21:30
  onTimeOff?: boolean; // approved leave covers this date
}

/**
 * Validate a single cell. Never auto-fixes — returns issues only.
 * - error: half-filled IN/OUT, end <= start, outside branch hours, bad format
 * - warning: unscheduled empty, scheduled on approved time off
 */
export function validateCell(c: ValidateCellInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const base = { employeeId: c.employeeId, date: c.date };
  const { start, end } = c;

  // Empty cell: OFF (confirmed) vs unscheduled (warning)
  if (!start && !end) {
    if (!c.isOff) {
      issues.push({ level: "warning", code: "unscheduled", message: "Not yet scheduled", ...base });
    }
    return issues;
  }

  // Half-filled
  if ((start && !end) || (!start && end)) {
    issues.push({ level: "error", code: "half-filled", message: "Missing START or FINISH", ...base });
    return issues;
  }

  if (!isValidTime(start) || !isValidTime(end)) {
    issues.push({ level: "error", code: "bad-format", message: "Time must be HH:MM (24h)", ...base });
    return issues;
  }

  // No overnight: end must be strictly after start
  if (toMinutes(end) <= toMinutes(start)) {
    issues.push({ level: "error", code: "end-before-start", message: "FINISH must be after START (no overnight shifts)", ...base });
    return issues;
  }

  const open = c.openingTime ?? "07:00";
  const close = c.closingTime ?? "21:30";
  if (isValidTime(open) && isValidTime(close)) {
    if (toMinutes(start) < toMinutes(open) || toMinutes(end) > toMinutes(close)) {
      issues.push({ level: "error", code: "outside-hours", message: `Outside branch hours ${open}–${close}`, ...base });
    }
  }

  if (c.onTimeOff) {
    issues.push({ level: "warning", code: "on-leave", message: "Scheduled on approved time off", ...base });
  }

  return issues;
}

export interface StaffingInput {
  date: string;
  scheduledCount: number;
  minRequired?: number;
}

/** Warn when a day is understaffed vs branch minimum. */
export function validateStaffing(days: StaffingInput[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const d of days) {
    if (d.minRequired != null && d.scheduledCount < d.minRequired) {
      issues.push({
        level: "warning",
        code: "understaffed",
        message: `Only ${d.scheduledCount} scheduled (min ${d.minRequired})`,
        date: d.date,
      });
    }
  }
  return issues;
}
