/**
 * Returns scheduled hours per employee for a given month + location.
 * GET ?month=YYYY-MM&location_id=xxx
 * Used by the attendance module to show scheduled vs. worked hours.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { computeShiftHours } from "@/lib/scheduling/schedule-math";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "attendance")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM
  const locationId = searchParams.get("location_id");

  if (!month || !locationId) {
    return Response.json({ error: "month and location_id are required" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const fromDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const toDate   = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedule_shifts")
    .select("employee_id, shift_date, start_time, end_time, break_minutes, schedules!inner(location_id, deleted_at)")
    .eq("schedules.location_id", locationId)
    .is("schedules.deleted_at", null)
    .eq("organization_id", DEFAULT_ORG_ID)
    .gte("shift_date", fromDate)
    .lte("shift_date", toDate)
    .not("start_time", "is", null);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Group by employee: { employee_id → { total_hours, shifts: [{ date, hours }] } }
  const byEmployee = new Map<string, { scheduled_hours: number; shift_dates: string[] }>();
  for (const s of (data ?? [])) {
    if (!s.start_time || !s.end_time) continue;
    const h = computeShiftHours(s.start_time as string, s.end_time as string, s.break_minutes ?? 30);
    const entry = byEmployee.get(s.employee_id) ?? { scheduled_hours: 0, shift_dates: [] };
    entry.scheduled_hours = Math.round((entry.scheduled_hours + h) * 100) / 100;
    entry.shift_dates.push(s.shift_date as string);
    byEmployee.set(s.employee_id, entry);
  }

  return Response.json(
    Array.from(byEmployee.entries()).map(([employee_id, v]) => ({
      employee_id,
      scheduled_hours: v.scheduled_hours,
      shift_count: v.shift_dates.length,
      shift_dates: v.shift_dates.sort(),
    }))
  );
}
