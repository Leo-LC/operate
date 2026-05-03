import { getSupabaseServerClient } from "@/lib/supabase-server";
import type {
  Branch,
  Employee,
  TimeAdjustment,
  WeeklySchedule,
  WeeklyScheduleShift,
} from "@/lib/scheduling/types";

export async function listBranches(): Promise<Branch[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("branches").select("*").order("name");
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, code: r.code }));
}

export async function listEmployees(): Promise<Employee[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("employees").select("*").order("full_name");
  return (data ?? []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    baseSalaryMonthly: Number(r.base_salary_monthly),
    active: Boolean(r.active),
  }));
}

export async function createEmployee(input: {
  fullName: string;
  email: string | null;
  baseSalaryMonthly: number;
  branchIds: string[];
}) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({ full_name: input.fullName, email: input.email, base_salary_monthly: input.baseSalaryMonthly, active: true })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create employee");

  if (input.branchIds.length > 0) {
    await supabase
      .from("employee_branch_assignments")
      .insert(input.branchIds.map((branchId) => ({ employee_id: data.id, branch_id: branchId })));
  }
}

export async function listEmployeeAssignmentsByBranch(branchId: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("employee_branch_assignments").select("employee_id").eq("branch_id", branchId);
  return (data ?? []).map((r) => r.employee_id as string);
}

export async function listSchedules(branchId: string, weekStartDate?: string): Promise<WeeklySchedule[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("weekly_schedules").select("*").eq("branch_id", branchId);
  if (weekStartDate) query = query.eq("week_start_date", weekStartDate);
  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    weekStartDate: r.week_start_date,
    status: r.status,
    breakMinutesDefault: r.break_minutes_default,
  }));
}

export async function createOrUpdateSchedule(input: {
  branchId: string;
  weekStartDate: string;
  breakMinutesDefault: number;
  shifts: Omit<WeeklyScheduleShift, "id" | "scheduleId">[];
}) {
  const supabase = getSupabaseServerClient();

  let scheduleId: string | null = null;
  const { data: existing } = await supabase
    .from("weekly_schedules")
    .select("id")
    .eq("branch_id", input.branchId)
    .eq("week_start_date", input.weekStartDate)
    .eq("status", "active")
    .maybeSingle();

  if (existing?.id) {
    scheduleId = existing.id;
    await supabase.from("weekly_schedules").update({ break_minutes_default: input.breakMinutesDefault }).eq("id", scheduleId);
  } else {
    const { data, error } = await supabase
      .from("weekly_schedules")
      .insert({ branch_id: input.branchId, week_start_date: input.weekStartDate, status: "active", break_minutes_default: input.breakMinutesDefault })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create schedule");
    scheduleId = data.id;
  }

  await supabase.from("weekly_schedule_shifts").delete().eq("schedule_id", scheduleId);
  if (input.shifts.length > 0) {
    await supabase.from("weekly_schedule_shifts").insert(
      input.shifts.map((shift) => ({
        schedule_id: scheduleId,
        employee_id: shift.employeeId,
        date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        break_minutes_override: shift.breakMinutesOverride,
      })),
    );
  }
  return scheduleId;
}

export async function archiveSchedule(scheduleId: string) {
  const supabase = getSupabaseServerClient();
  await supabase.from("weekly_schedules").update({ status: "archived" }).eq("id", scheduleId);
}

export async function listShifts(scheduleId: string): Promise<WeeklyScheduleShift[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("weekly_schedule_shifts").select("*").eq("schedule_id", scheduleId).order("date").order("start_time");
  return (data ?? []).map((r) => ({
    id: r.id,
    scheduleId: r.schedule_id,
    employeeId: r.employee_id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    breakMinutesOverride: r.break_minutes_override,
  }));
}

export async function listAdjustments(params: { branchId: string; month?: string }): Promise<TimeAdjustment[]> {
  const { branchId, month } = params;
  const supabase = getSupabaseServerClient();
  let query = supabase.from("time_adjustments").select("*").eq("branch_id", branchId);
  if (month) query = query.gte("date", `${month}-01`).lt("date", `${month}-32`);
  const { data } = await query.order("date", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    employeeId: r.employee_id,
    date: r.date,
    type: r.type,
    hours: Number(r.hours),
    note: r.note,
  }));
}

export async function addAdjustment(input: Omit<TimeAdjustment, "id">) {
  const supabase = getSupabaseServerClient();
  await supabase
    .from("time_adjustments")
    .insert({ branch_id: input.branchId, employee_id: input.employeeId, date: input.date, type: input.type, hours: input.hours, note: input.note });
}

export async function getCompanySetting() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
  return {
    id: data?.id ?? "",
    standardHoursPerMonth: Number(data?.standard_hours_per_month ?? 160),
    overtimeMultiplier: Number(data?.overtime_multiplier ?? 1.5),
    defaultBreakMinutes: Number(data?.default_break_minutes ?? 30),
  };
}
