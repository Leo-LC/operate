/**
 * Returns scheduled hours per employee for a given month + location.
 * GET ?month=YYYY-MM&location_id=xxx
 * Used by the attendance module to show scheduled vs. worked hours.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
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

  // Step 1: get valid schedule IDs for this location (avoids dot-notation filter ambiguity)
  const { data: schedData, error: schedErr } = await supabase
    .from("schedules")
    .select("id")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("location_id", locationId)
    .is("deleted_at", null);

  if (schedErr) return Response.json({ error: schedErr.message }, { status: 500 });
  const scheduleIds = (schedData ?? []).map((s) => s.id);
  if (scheduleIds.length === 0) return Response.json([]);

  // Step 2: fetch all shifts within the month (including day-offs where start_time is null)
  const { data, error } = await supabase
    .from("schedule_shifts")
    .select("employee_id, shift_date, start_time, end_time, break_minutes")
    .in("schedule_id", scheduleIds)
    .gte("shift_date", fromDate)
    .lte("shift_date", toDate);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(
    (data ?? []).map((s) => ({
      employee_id: s.employee_id,
      shift_date: s.shift_date,
      start_time: s.start_time ?? null,
      end_time: s.end_time ?? null,
      break_minutes: s.break_minutes ?? null,
    }))
  );
}
