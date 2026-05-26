import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data: user, error } = await supabase
    .from("users")
    .select(`
      id, email, name, global_role, organization_id, created_at, updated_at,
      user_module_access!user_module_access_user_id_fkey ( id, module_key, can_read, can_write, granted_at ),
      user_location_access!user_location_access_user_id_fkey ( id, location_id, granted_at, locations ( name ) )
    `)
    .eq("id", params.id)
    .single();

  if (error || !user) return Response.json({ error: "User not found" }, { status: 404 });

  type LaRow = { id: string; location_id: string; granted_at: string; locations: { name: string } | null };
  const mapped = {
    ...user,
    module_access: user.user_module_access ?? [],
    location_access: (user.user_location_access as unknown as LaRow[] ?? []).map((la) => ({
      id: la.id,
      location_id: la.location_id,
      location_name: la.locations?.name ?? la.location_id,
      granted_at: la.granted_at,
    })),
    user_module_access: undefined,
    user_location_access: undefined,
  };

  return Response.json(mapped);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { global_role?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.global_role !== undefined) {
    const validRoles = ["owner", "admin", "member"];
    if (!validRoles.includes(body.global_role)) {
      return Response.json({ error: "Invalid global_role" }, { status: 400 });
    }
    updates.global_role = body.global_role;
  }
  if (body.name !== undefined) updates.name = body.name;
  if (body.password) updates.password_hash = await bcrypt.hash(body.password, 10);

  const supabase = getSupabaseServerClient();
  const { data: user, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !user) return Response.json({ error: "User not found or update failed" }, { status: 404 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.user.update",
    moduleKey: "admin",
    entityType: "user",
    entityId: params.id,
    payload: updates,
  });

  return Response.json(user);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  if (session.user.userId === params.id) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("users").delete().eq("id", params.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.user.delete",
    moduleKey: "admin",
    entityType: "user",
    entityId: params.id,
    payload: {},
  });

  return new Response(null, { status: 204 });
}
