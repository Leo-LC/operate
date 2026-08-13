import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import type { ModuleKey } from "@/core/permissions/types";

const VALID_MODULES: ModuleKey[] = [
  "reviews", "documents", "animals", "schedules", "accounting", "reports", "contacts", "wiki", "brand",
];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_module_access")
    .select("id, module_key, can_read, can_write, granted_at")
    .eq("user_id", params.id)
    .order("module_key");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { module_key: string; can_read?: boolean; can_write?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!VALID_MODULES.includes(body.module_key as ModuleKey)) {
    return Response.json({ error: "Invalid module_key" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_module_access")
    .upsert({
      user_id: params.id,
      module_key: body.module_key,
      can_read: body.can_read ?? true,
      can_write: body.can_write ?? false,
      granted_by: session.user.userId ?? null,
    }, { onConflict: "user_id,module_key" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.module_access.grant",
    moduleKey: "admin",
    entityType: "user",
    entityId: params.id,
    payload: { module_key: body.module_key, can_read: body.can_read ?? true, can_write: body.can_write ?? false },
  });

  return Response.json(data, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { module_key: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("user_module_access")
    .delete()
    .eq("user_id", params.id)
    .eq("module_key", body.module_key);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.module_access.revoke",
    moduleKey: "admin",
    entityType: "user",
    entityId: params.id,
    payload: { module_key: body.module_key },
  });

  return new Response(null, { status: 204 });
}
