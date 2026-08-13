import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess, derivePermissionsFromRole } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import type { SessionRole } from "@/core/permissions/types";

async function guardAndGetSchedule(scheduleId: string, role: SessionRole | undefined) {
  const perms = derivePermissionsFromRole(role);
  if (!hasModuleAccess(perms, "schedules")) return null;
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("schedules")
    .select("id")
    .eq("id", scheduleId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .single();
  return data;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const schedule = await guardAndGetSchedule(params.id, session.user.role);
  if (!schedule) return Response.json({ error: "Forbidden or not found" }, { status: 403 });

  let body: {
    shifts: Array<{
      employee_id: string;
      shift_date: string;
      start_time: string | null;
      end_time: string | null;
      break_minutes?: number;
      notes?: string | null;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.shifts)) {
    return Response.json({ error: "shifts must be an array" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  // Delete all existing shifts for this schedule then re-insert (simplest bulk-upsert strategy)
  const { error: delErr } = await supabase
    .from("schedule_shifts")
    .delete()
    .eq("schedule_id", params.id);

  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

  // Filter out OFF shifts (no start_time) — only persist actual working shifts
  const activeShifts = body.shifts.filter((s) => s.start_time !== null && s.start_time !== "");
  if (activeShifts.length > 0) {
    const rows = activeShifts.map((s) => ({
      schedule_id: params.id,
      employee_id: s.employee_id,
      shift_date: s.shift_date,
      start_time: s.start_time ?? null,
      end_time: s.end_time ?? null,
      break_minutes: s.break_minutes ?? 30,
      notes: s.notes ?? null,
    }));

    const { error: insErr } = await supabase.from("schedule_shifts").insert(rows);
    if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  }

  // Update schedule updated_at
  await supabase
    .from("schedules")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.id);

  return Response.json({ ok: true });
}
