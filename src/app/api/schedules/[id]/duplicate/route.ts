import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess, derivePermissionsFromRole } from "@/core/permissions/guards";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { name?: string; week_start_date?: string } = {};
  try {
    body = await request.json();
  } catch { /* body is optional */ }

  const supabase = getSupabaseServerClient();

  const { data: source, error: srcErr } = await supabase
    .from("schedules")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .single();

  if (srcErr) return Response.json({ error: "Source schedule not found" }, { status: 404 });

  const { data: newSchedule, error: insErr } = await supabase
    .from("schedules")
    .insert({
      organization_id: ORG_ID,
      location_id: source.location_id,
      name: body.name ?? `${source.name} (copy)`,
      week_start_date: body.week_start_date ?? source.week_start_date,
      status: "draft",
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();

  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });

  const { data: sourceShifts } = await supabase
    .from("schedule_shifts")
    .select("employee_id, shift_date, start_time, end_time, break_minutes, notes")
    .eq("schedule_id", params.id);

  if (sourceShifts && sourceShifts.length > 0) {
    const shiftRows = sourceShifts.map((s) => ({
      schedule_id: newSchedule.id,
      employee_id: s.employee_id,
      shift_date: s.shift_date,
      start_time: s.start_time,
      end_time: s.end_time,
      break_minutes: s.break_minutes,
      notes: s.notes,
    }));
    await supabase.from("schedule_shifts").insert(shiftRows);
  }

  return Response.json(newSchedule, { status: 201 });
}
