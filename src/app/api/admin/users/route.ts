import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import {
  ADMIN_USER_LIST_SELECT,
  ADMIN_USER_SELECT,
  isMissingAssignedPasswordColumn,
  mapAdminUser,
} from "@/modules/admin/lib/users";
import type { DbUserRow } from "@/modules/admin/lib/users";
import bcrypt from "bcryptjs";
import { encryptPassword } from "@/lib/password-crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data: users, error } = await supabase
    .from("users")
    .select(ADMIN_USER_LIST_SELECT)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json((users ?? []).map((u) => mapAdminUser(u)));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { email: string; name?: string; global_role?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return Response.json({ error: "email is required" }, { status: 400 });

  const validRoles = ["owner", "admin", "member", "reviewer"] as const;
  const global_role = validRoles.includes(body.global_role as (typeof validRoles)[number])
    ? body.global_role
    : "member";

  const password_hash = body.password ? await bcrypt.hash(body.password, 10) : null;
  const assigned_password_encrypted = body.password ? encryptPassword(body.password) : null;

  const supabase = getSupabaseServerClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const insertValues = {
    email,
    name: body.name ?? null,
    global_role,
    organization_id: org?.id ?? null,
    password_hash,
    assigned_password_encrypted,
  };

  const initialResult = await supabase
    .from("users")
    .insert(insertValues)
    .select(ADMIN_USER_SELECT)
    .single();
  let user: DbUserRow | null = initialResult.data;
  let error = initialResult.error;

  if (isMissingAssignedPasswordColumn(error)) {
    const compatibleValues = {
      email: insertValues.email,
      name: insertValues.name,
      global_role: insertValues.global_role,
      organization_id: insertValues.organization_id,
      password_hash: insertValues.password_hash,
    };
    ({ data: user, error } = await supabase
      .from("users")
      .insert(compatibleValues)
      .select(ADMIN_USER_LIST_SELECT)
      .single());
  }

  if (error || !user) {
    if (error?.code === "23505") return Response.json({ error: "Email already exists" }, { status: 409 });
    return Response.json({ error: error?.message ?? "User creation failed" }, { status: 500 });
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.user.create",
    moduleKey: "admin",
    entityType: "user",
    entityId: user.id,
    payload: { email, global_role, has_password: !!password_hash },
  });

  return Response.json(mapAdminUser(user), { status: 201 });
}
