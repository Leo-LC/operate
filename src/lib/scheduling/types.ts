export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface Employee {
  id: string;
  fullName: string;
  email: string | null;
  baseSalaryMonthly: number;
  active: boolean;
}

export interface EmployeeBranchAssignment {
  id: string;
  employeeId: string;
  branchId: string;
}

export type ScheduleStatus = "active" | "archived";

export interface WeeklySchedule {
  id: string;
  branchId: string;
  weekStartDate: string;
  status: ScheduleStatus;
  breakMinutesDefault: number;
}

export interface WeeklyScheduleShift {
  id: string;
  scheduleId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutesOverride: number | null;
}

export type AdjustmentType = "overtime" | "missed_undertime";

export interface TimeAdjustment {
  id: string;
  branchId: string;
  employeeId: string;
  date: string;
  type: AdjustmentType;
  hours: number;
  note: string | null;
}

export interface CompanySetting {
  id: string;
  standardHoursPerMonth: number;
  overtimeMultiplier: number;
  defaultBreakMinutes: number;
}

export interface MonthlyEmployeeRecap {
  employeeId: string;
  employeeName: string;
  branchId: string;
  overtimeHours: number;
  missedHours: number;
  netHoursDelta: number;
  baseHourly: number;
  overtimeAmount: number;
  deductionAmount: number;
  netAdjustmentAmount: number;
}
