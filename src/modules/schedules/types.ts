export type ScheduleStatus = "draft" | "published" | "archived";

export interface Schedule {
  id: string;
  organization_id: string;
  location_id: string;
  location_name: string | null;
  name: string;
  week_start_date: string; // ISO date: YYYY-MM-DD (always Monday)
  status: ScheduleStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleShift {
  id: string;
  schedule_id: string;
  employee_id: string;
  employee_name: string | null;
  shift_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM — null means day off
  end_time: string | null;
  break_minutes: number;
  notes: string | null;
}

// Keyed by `${employee_id}__${YYYY-MM-DD}`
export type ShiftGrid = Record<string, CellData>;

export interface CellData {
  shiftId: string | null; // null = unsaved new cell
  start_time: string; // "" = day off
  end_time: string;
  break_minutes: number;
  notes: string;
  dirty: boolean;
}

export const EMPTY_CELL: CellData = {
  shiftId: null,
  start_time: "",
  end_time: "",
  break_minutes: 30,
  notes: "",
  dirty: false,
};

export const STATUS_LABELS: Record<ScheduleStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const STATUS_CLASSES: Record<ScheduleStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-muted/60 text-muted-foreground/60",
};
