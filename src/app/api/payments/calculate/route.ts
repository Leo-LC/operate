/**
 * Auto-calculates overtime pay and service charge for a period + location.
 * POST body: { period_year, period_month, location_id }
 * Returns: array of { employee_id, base_salary, overtime_pay, service_charge, payment_method }
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { buildSummary, DEFAULT_HR_SETTINGS, type HrSettings } from "@/modules/attendance/types";
import type { AttendanceRecord } from "@/modules/attendance/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

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

  // Build date range for the period
  const monthPad = String(period_month).padStart(2, "0");
  const lastDay = new Date(period_year, period_month, 0).getDate();
  const fromDate = `${period_year}-${monthPad}-01`;
  const toDate   = `${period_year}-${monthPad}-${String(lastDay).padStart(2, "0")}`;

  const [empRes, attRes, settRes, dailyRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, base_salary_monthly, has_thai_bank_account, location_id, employee_locations(location_id)")
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
  ]);

  const settings: HrSettings = settRes.data ?? DEFAULT_HR_SETTINGS;

  // Calculate total net revenue for the period (for service charge = 1%)
  const totalNetRevenue = (dailyRes.data ?? []).reduce((sum, row) => {
    return sum + (row.sales_drinks_net ?? 0) + (row.sales_ticket_net ?? 0) +
           (row.sales_snack_net ?? 0) + (row.sales_goodies_net ?? 0) + (row.sales_card_surcharge ?? 0);
  }, 0);
  const serviceChargePerEmployee = totalNetRevenue * 0.01;

  const locationEmployees = (empRes.data ?? []).filter((e) => {
    const locs = (e.employee_locations as { location_id: string }[] | null) ?? [];
    return locs.some((el) => el.location_id === location_id) || e.location_id === location_id;
  });

  const results = locationEmployees.map((emp) => {
    const empRecords = (attRes.data ?? []) as AttendanceRecord[];
    const summary = buildSummary(
      emp.id,
      `${emp.first_name} ${emp.last_name}`,
      emp.base_salary_monthly as number | null,
      emp.has_thai_bank_account as boolean,
      empRecords.filter((r) => r.employee_id === emp.id),
      settings,
    );

    return {
      employee_id: emp.id,
      employee_name: summary.employee_name,
      base_salary: emp.base_salary_monthly ?? 0,
      overtime_pay: Math.round(summary.ot_pay * 100) / 100,
      service_charge: locationEmployees.length > 0
        ? Math.round((serviceChargePerEmployee / locationEmployees.length) * 100) / 100
        : 0,
      payment_method: emp.has_thai_bank_account ? "bank_transfer" : "cash",
    };
  });

  return Response.json(results);
}
