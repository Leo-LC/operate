import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "attendance")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: Partial<{ record_type: string; hours: number | null; note: string | null }>;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("attendance_records")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "attendance")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("attendance_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ORG_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
