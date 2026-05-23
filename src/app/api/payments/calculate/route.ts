/**
 * Auto-calculates payroll for a period + location.
 * POST body: { period_year, period_month, location_id }
 *
 * Calculation logic:
 * - deductions: unpaid_leave_days × (base_salary / scheduled_working_days)
 * - service_charge: total_net_revenue × 0.01 per employee individually
 * - overtime_pay: OT attendance records × hourly_rate × 1.5
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { buildSummary, DEFAULT_HR_SETTINGS, type HrSettings } from "@/modules/attendance/types";
import type { AttendanceRecord } from "@/modules/attendance/types";
import { computeShiftHours } from "@/lib/scheduling/schedule-math";
import { DEFAULT_ORG_ID } from "@/lib/constants";

const DEDUCTIBLE_TYPES = new Set(["absence", "sick_leave", "unpaid_leave"]);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { period_year: number; period_month: number; location_id: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { period_year, period_month, location_id } = body;
  if (!period_year || !period_month || !location_id) {
    return Response.json({ error: "period_year, period_month, location_id required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const monthPad = String(period_month).padStart(2, "0");
  const lastDay = new Date(period_year, period_month, 0).getDate();
  const fromDate = `${period_year}-${monthPad}-01`;
  const toDate   = `${period_year}-${monthPad}-${String(lastDay).padStart(2, "0")}`;

  // Step 1: get valid schedule IDs for this location first (avoids dot-notation filter ambiguity)
  const { data: schedData } = await supabase
    .from("schedules")
    .select("id")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("location_id", location_id)
    .is("deleted_at", null);

  const scheduleIds = (schedData ?? []).map((s) => s.id);

  const [empRes, attRes, settRes, dailyRes, shiftsRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, base_salary_monthly, has_thai_bank_account, credit_note, location_id, employee_locations(location_id)")
      .eq("organization_id", DEFAULT_ORG_ID)
      .is("archived_at", null)
      .is("deleted_at", null),
    supabase
      .from("attendance_records")
      .select("*")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("location_id", location_id)
      .gte("record_date", fromDate)
      .lte("record_date", toDate)
      .is("deleted_at", null),
    supabase
      .from("hr_settings")
      .select("*")
      .eq("organization_id", DEFAULT_ORG_ID)
      .single(),
    supabase
      .from("daily_entries")
      .select("sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, sales_card_surcharge")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("location_id", location_id)
      .gte("entry_date", fromDate)
      .lte("entry_date", toDate),
    // Step 2: shifts from valid schedules only (no cross-location contamination)
    scheduleIds.length > 0
      ? supabase
          .from("schedule_shifts")
          .select("employee_id, shift_date, start_time, end_time, break_minutes")
          .in("schedule_id", scheduleIds)
          .gte("shift_date", fromDate)
          .lte("shift_date", toDate)
          .not("start_time", "is", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const settings: HrSettings = settRes.data ?? DEFAULT_HR_SETTINGS;

  const totalNetRevenue = (dailyRes.data ?? []).reduce((sum, row) => {
    return sum + (row.sales_drinks_net ?? 0) + (row.sales_ticket_net ?? 0) +
           (row.sales_snack_net ?? 0) + (row.sales_goodies_net ?? 0) + (row.sales_card_surcharge ?? 0);
  }, 0);
  const serviceChargePerEmployee = totalNetRevenue * 0.01;

  const locationEmployees = (empRes.data ?? []).filter((e) => {
    const locs = (e.employee_locations as { location_id: string }[] | null) ?? [];
    return locs.some((el) => el.location_id === location_id) || e.location_id === location_id;
  });

  // Build a map: employee_id → { date → shift_hours } for quick lookup
  type ShiftMap = Map<string, Map<string, number>>;
  const shiftsByEmployee: ShiftMap = new Map();
  for (const s of (shiftsRes.data ?? [])) {
    if (!s.start_time || !s.end_time) continue;
    let byDate = shiftsByEmployee.get(s.employee_id);
    if (!byDate) { byDate = new Map(); shiftsByEmployee.set(s.employee_id, byDate); }
    const h = computeShiftHours(s.start_time as string, s.end_time as string, s.break_minutes ?? 30);
    byDate.set(s.shift_date as string, (byDate.get(s.shift_date as string) ?? 0) + h);
  }

  // Fetch existing payment records to preserve manually-overridden fields
  const { data: existingRecords } = await supabase
    .from("employee_payment_records")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("location_id", location_id)
    .eq("period_year", period_year)
    .eq("period_month", period_month);
  const existingMap = new Map((existingRecords ?? []).map((r) => [r.employee_id as string, r]));

  const results = locationEmployees.map((emp) => {
    const empAttendance = (attRes.data ?? []) as AttendanceRecord[];
    const empRecords = empAttendance.filter((r) => r.employee_id === emp.id);
    const summary = buildSummary(
      emp.id,
      `${emp.first_name} ${emp.last_name}`,
      emp.base_salary_monthly as number | null,
      emp.has_thai_bank_account as boolean,
      empRecords,
      settings,
    );

    const byDate = shiftsByEmployee.get(emp.id) ?? new Map<string, number>();

    const baseSalary = (emp.base_salary_monthly as number | null) ?? 0;
    // Deduction: unpaid leave days × daily rate (base_salary / scheduled working days)
    const scheduledDays = byDate.size;
    const daily_rate = scheduledDays > 0 && baseSalary > 0
      ? baseSalary / scheduledDays
      : (baseSalary > 0 ? baseSalary / lastDay : 0);
    const deductibleDays = empRecords
      .filter((r) => DEDUCTIBLE_TYPES.has(r.record_type))
      .reduce((sum, r) => sum + ((r as unknown as { hours?: number | null }).hours ?? 1), 0);
    const deduction = Math.round(deductibleDays * daily_rate * 100) / 100;

    return {
      employee_id: emp.id,
      base_salary: baseSalary,
      deductions: deduction,
      overtime_pay: Math.round(summary.ot_pay * 100) / 100,
      service_charge: Math.round(serviceChargePerEmployee * 100) / 100,
      payment_method: (emp.has_thai_bank_account as boolean) ? "bank_transfer" : "cash",
    };
  });

  // Upsert all payment records server-side so the client gets the saved state back
  const upsertRows = results.map((c) => {
    const existing = existingMap.get(c.employee_id);
    return {
      organization_id: DEFAULT_ORG_ID,
      location_id:     location_id,
      employee_id:     c.employee_id,
      period_year,
      period_month,
      base_salary:           c.base_salary,
      deductions:            c.deductions,
      deduction_note:        existing?.deduction_note ?? null,
      overtime_pay:          c.overtime_pay,
      service_charge:        c.service_charge,
      bonus_amount:          existing?.bonus_amount ?? 0,
      bonus_note:            existing?.bonus_note ?? null,
      payment_method:        c.payment_method,
      status:                existing?.status ?? "draft",
      notes:                 existing?.notes ?? null,
      created_by:            session.user.userId ?? null,
      updated_at:            new Date().toISOString(),
    };
  });

  const { data: saved, error: upsertErr } = await supabase
    .from("employee_payment_records")
    .upsert(upsertRows, { onConflict: "employee_id,period_year,period_month" })
    .select();

  if (upsertErr) return Response.json({ error: upsertErr.message }, { status: 500 });
  return Response.json(saved ?? []);
}
