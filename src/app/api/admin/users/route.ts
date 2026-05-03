import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data: users, error } = await supabase
    .from("users")
    .select(`
      id, email, name, global_role, organization_id, created_at, updated_at,
      user_module_access ( id, module_key, can_read, can_write, granted_at ),
      user_location_access ( id, location_id, granted_at, locations ( name ) )
    `)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type LaRow = { id: string; location_id: string; granted_at: string; locations: { name: string } | null };
  const mapped = users?.map((u) => ({
    ...u,
    module_access: (u.user_module_access ?? []),
    location_access: (u.user_location_access as unknown as LaRow[] ?? []).map((la) => ({
      id: la.id,
      location_id: la.location_id,
      location_name: la.locations?.name ?? la.location_id,
      granted_at: la.granted_at,
    })),
    user_module_access: undefined,
    user_location_access: undefined,
  }));

  return Response.json(mapped);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { email: string; name?: string; global_role?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return Response.json({ error: "email is required" }, { status: 400 });

  const validRoles = ["owner", "admin", "member"] as const;
  const global_role = validRoles.includes(body.global_role as (typeof validRoles)[number])
    ? body.global_role
    : "member";

  const supabase = getSupabaseServerClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const { data: user, error } = await supabase
    .from("users")
    .insert({ email, name: body.name ?? null, global_role, organization_id: org?.id ?? null })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return Response.json({ error: "Email already exists" }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.user.create",
    moduleKey: "admin",
    entityType: "user",
    entityId: user.id,
    payload: { email, global_role },
  });

  return Response.json(user, { status: 201 });
}
