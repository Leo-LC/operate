export interface RangeEmployee {
  id: string;
  name: string;
  active: boolean;
  employment_start_date: string | null;
  employment_end_date: string | null;
}

export interface RangeShift {
  id: string;
  schedule_id: string;
  employee_id: string;
  shift_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_time: string | null;
  break_minutes: number;
  notes: string | null;
  is_off?: boolean;
}

export interface RangeSchedule {
  id: string;
  location_id: string;
  name: string;
  week_start_date: string;
  status: "draft" | "published" | "archived";
}

export interface RangeResponse {
  schedules: RangeSchedule[];
  shifts: RangeShift[];
  employees: RangeEmployee[];
}

export interface BranchSettings {
  location_id: string;
  opening_time: string;
  closing_time: string;
  default_break_minutes: number;
  min_staff_json: Record<string, number>;
  updated_at?: string;
  locations?: { name: string } | null;
}

export interface GlobalSettings {
  palette: Record<string, string>;
  shift_thresholds: { open_after_open_min: number; close_before_close_min: number };
  default_break_minutes: number;
}

export interface TimeOff {
  id: string;
  employee_id: string;
  location_id: string | null;
  date_from: string;
  date_to: string;
  kind: "approved" | "pending";
  reason: string | null;
}

/** Editor cell: "" + isOff=false = unscheduled; "" + isOff=true = OFF. */
export interface EditorCell {
  start: string;
  end: string;
  isOff: boolean;
  dirty: boolean;
}

export function cellKey(employeeId: string, date: string): string {
  return `${employeeId}__${date}`;
}

/** localStorage key keeping the selected shop in sync across Scheduling tabs. */
export const SCHEDULING_SHOP_KEY = "scheduling:location-id";

export function toHHMM(t: string | null | undefined): string {
  if (!t) return "";
  return t.length > 5 ? t.substring(0, 5) : t;
}
