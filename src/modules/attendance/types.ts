export type RecordType =
  | "overtime_weekday"
  | "overtime_weekend"
  | "overtime_holiday"
  | "paid_leave"
  | "sick_leave"
  | "unpaid_leave"
  | "public_holiday"
  | "absence";

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  overtime_weekday: "OT (weekday)",
  overtime_weekend: "OT (weekend)",
  overtime_holiday: "OT (holiday)",
  paid_leave: "Paid leave",
  sick_leave: "Sick leave",
  unpaid_leave: "Unpaid leave",
  public_holiday: "Public holiday",
  absence: "Absence",
};

export const RECORD_TYPE_COLORS: Record<RecordType, string> = {
  overtime_weekday: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  overtime_weekend: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  overtime_holiday: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  paid_leave: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  sick_leave: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  unpaid_leave: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  public_holiday: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  absence: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export const OT_TYPES: RecordType[] = ["overtime_weekday", "overtime_weekend", "overtime_holiday"];
export const LEAVE_TYPES: RecordType[] = ["paid_leave", "sick_leave", "unpaid_leave", "public_holiday", "absence"];

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  location_id: string;
  employee_id: string;
  record_date: string;
  record_type: RecordType;
  hours: number | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HrSettings {
  overtime_weekday_multiplier: number;
  overtime_weekend_multiplier: number;
  overtime_holiday_multiplier: number;
  monthly_hours_divisor: number;
}

export const DEFAULT_HR_SETTINGS: HrSettings = {
  overtime_weekday_multiplier: 1.5,
  overtime_weekend_multiplier: 2.0,
  overtime_holiday_multiplier: 2.0,
  monthly_hours_divisor: 208,
};

export function getMultiplier(type: RecordType, settings: HrSettings): number {
  if (type === "overtime_weekday") return settings.overtime_weekday_multiplier;
  if (type === "overtime_weekend") return settings.overtime_weekend_multiplier;
  if (type === "overtime_holiday") return settings.overtime_holiday_multiplier;
  return 0;
}

export interface EmployeeAttendanceSummary {
  employee_id: string;
  employee_name: string;
  base_salary_monthly: number | null;
  has_thai_bank_account: boolean;
  ot_weekday_hours: number;
  ot_weekend_hours: number;
  ot_holiday_hours: number;
  paid_leave_days: number;
  sick_leave_days: number;
  unpaid_leave_days: number;
  public_holiday_days: number;
  absence_days: number;
  ot_pay: number;
  records: AttendanceRecord[];
}

export function buildSummary(
  employeeId: string,
  employeeName: string,
  baseSalary: number | null,
  hasThaiBank: boolean,
  records: AttendanceRecord[],
  settings: HrSettings,
): EmployeeAttendanceSummary {
  const hourlyRate = baseSalary != null ? baseSalary / settings.monthly_hours_divisor : 0;

  let ot_weekday_hours = 0, ot_weekend_hours = 0, ot_holiday_hours = 0;
  let paid_leave_days = 0, sick_leave_days = 0, unpaid_leave_days = 0;
  let public_holiday_days = 0, absence_days = 0;

  for (const r of records) {
    switch (r.record_type) {
      case "overtime_weekday":  ot_weekday_hours  += r.hours ?? 0; break;
      case "overtime_weekend":  ot_weekend_hours  += r.hours ?? 0; break;
      case "overtime_holiday":  ot_holiday_hours  += r.hours ?? 0; break;
      case "paid_leave":        paid_leave_days   += 1; break;
      case "sick_leave":        sick_leave_days   += 1; break;
      case "unpaid_leave":      unpaid_leave_days += 1; break;
      case "public_holiday":    public_holiday_days += 1; break;
      case "absence":           absence_days      += 1; break;
    }
  }

  const ot_pay =
    ot_weekday_hours  * hourlyRate * settings.overtime_weekday_multiplier +
    ot_weekend_hours  * hourlyRate * settings.overtime_weekend_multiplier +
    ot_holiday_hours  * hourlyRate * settings.overtime_holiday_multiplier;

  return {
    employee_id: employeeId,
    employee_name: employeeName,
    base_salary_monthly: baseSalary,
    has_thai_bank_account: hasThaiBank,
    ot_weekday_hours,
    ot_weekend_hours,
    ot_holiday_hours,
    paid_leave_days,
    sick_leave_days,
    unpaid_leave_days,
    public_holiday_days,
    absence_days,
    ot_pay,
    records,
  };
}
