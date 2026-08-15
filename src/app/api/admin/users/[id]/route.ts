import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import {
  ADMIN_USER_LIST_SELECT,
  ADMIN_USER_SELECT,
  isMissingAssignedPasswordColumn,
  mapAdminUser,
  sanitizeAuditUpdates,
} from "@/modules/admin/lib/users";
import type { DbUserRow } from "@/modules/admin/lib/users";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/password-crypto";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const initialResult = await supabase
    .from("users")
    .select(ADMIN_USER_SELECT)
    .eq("id", params.id)
    .single();
  let user: DbUserRow | null = initialResult.data;
  let error = initialResult.error;

  if (isMissingAssignedPasswordColumn(error)) {
    ({ data: user, error } = await supabase
      .from("users")
      .select(ADMIN_USER_LIST_SELECT)
      .eq("id", params.id)
      .single());
  }

  if (error || !user) return Response.json({ error: "User not found" }, { status: 404 });

  return Response.json(mapAdminUser(user, { includeAssignedPassword: true }));
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
    const validRoles = ["owner", "admin", "member", "reviewer", "direction"];
    if (!validRoles.includes(body.global_role)) {
      return Response.json({ error: "Invalid global_role" }, { status: 400 });
    }
    updates.global_role = body.global_role;
  }
  if (body.name !== undefined) updates.name = body.name;
  if (body.password) {
    updates.password_hash = await bcrypt.hash(body.password, 10);
    updates.assigned_password_encrypted = encryptPassword(body.password);
  }

  const supabase = getSupabaseServerClient();
  const initialResult = await supabase
    .from("users")
    .update(updates)
    .eq("id", params.id)
    .select(ADMIN_USER_SELECT)
    .single();
  let user: DbUserRow | null = initialResult.data;
  let error = initialResult.error;

  if (isMissingAssignedPasswordColumn(error)) {
    delete updates.assigned_password_encrypted;
    ({ data: user, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", params.id)
      .select(ADMIN_USER_LIST_SELECT)
      .single());
  }

  if (error || !user) return Response.json({ error: "User not found or update failed" }, { status: 404 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.user.update",
    moduleKey: "admin",
    entityType: "user",
    entityId: params.id,
    payload: sanitizeAuditUpdates(updates),
  });

  return Response.json(mapAdminUser(user, { includeAssignedPassword: true }));
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
