import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*, locations ( name )")
    .eq("id", params.id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });

  return Response.json({
    ...data,
    location_name: (data.locations as { name: string } | null)?.name ?? null,
    locations: undefined,
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: Partial<{
    first_name: string;
    last_name: string;
    position: string | null;
    location_id: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    active: boolean;
    user_id: string | null;
  }>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.first_name !== undefined) updates.first_name = body.first_name.trim();
  if (body.last_name !== undefined) updates.last_name = body.last_name.trim();
  if ("position" in body) updates.position = body.position?.trim() ?? null;
  if ("location_id" in body) updates.location_id = body.location_id ?? null;
  if ("email" in body) updates.email = body.email?.trim().toLowerCase() ?? null;
  if ("phone" in body) updates.phone = body.phone?.trim() ?? null;
  if ("notes" in body) updates.notes = body.notes?.trim() ?? null;
  if (body.active !== undefined) updates.active = body.active;
  if ("user_id" in body) updates.user_id = body.user_id ?? null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.update",
    moduleKey: "admin",
    entityType: "employee",
    entityId: params.id,
    payload: updates,
  });

  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ deleted_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("organization_id", ORG_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.delete",
    moduleKey: "admin",
    entityType: "employee",
    entityId: params.id,
    payload: undefined,
  });

  return Response.json({ ok: true });
}
