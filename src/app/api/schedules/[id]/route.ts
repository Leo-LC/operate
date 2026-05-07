import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess, derivePermissionsFromRole } from "@/core/permissions/guards";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data: schedule, error: sErr } = await supabase
    .from("schedules")
    .select("*, locations ( name )")
    .eq("id", params.id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .single();

  if (sErr) return Response.json({ error: sErr.message }, { status: 404 });

  const { data: shifts, error: shErr } = await supabase
    .from("schedule_shifts")
    .select("id, schedule_id, employee_id, shift_date, start_time, end_time, break_minutes, notes, employees ( first_name, last_name )")
    .eq("schedule_id", params.id);

  if (shErr) return Response.json({ error: shErr.message }, { status: 500 });

  type ShiftRow = { id: string; schedule_id: string; employee_id: string; shift_date: string; start_time: string | null; end_time: string | null; break_minutes: number; notes: string | null; employees: { first_name: string; last_name: string } | null };
  const mappedShifts = (shifts as unknown as ShiftRow[]).map((sh) => ({
    ...sh,
    employee_name: sh.employees ? `${sh.employees.first_name} ${sh.employees.last_name}` : null,
    employees: undefined,
  }));

  return Response.json({
    ...schedule,
    location_name: (schedule.locations as { name: string } | null)?.name ?? null,
    locations: undefined,
    shifts: mappedShifts,
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: Partial<{ name: string; status: string }>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validStatuses = ["draft", "published", "archived"] as const;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name) updates.name = body.name.trim();
  if (body.status && validStatuses.includes(body.status as (typeof validStatuses)[number])) {
    updates.status = body.status;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedules")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("schedules")
    .update({ deleted_at: new Date().toISOString(), status: "archived", updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("organization_id", ORG_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
