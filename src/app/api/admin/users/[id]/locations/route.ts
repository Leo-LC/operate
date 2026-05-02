import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_location_access")
    .select("id, location_id, granted_at, locations ( name )")
    .eq("user_id", params.id)
    .order("granted_at");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type LaRow = { id: string; location_id: string; granted_at: string; locations: { name: string } | null };
  const mapped = (data as unknown as LaRow[] ?? []).map((la) => ({
    id: la.id,
    location_id: la.location_id,
    location_name: la.locations?.name ?? la.location_id,
    granted_at: la.granted_at,
  }));

  return Response.json(mapped);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { location_id: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.location_id) return Response.json({ error: "location_id is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_location_access")
    .upsert({
      user_id: params.id,
      location_id: body.location_id,
      granted_by: session.user.userId ?? null,
    }, { onConflict: "user_id,location_id" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.location_access.grant",
    moduleKey: "admin",
    entityType: "user",
    entityId: params.id,
    payload: { location_id: body.location_id },
  });

  return Response.json(data, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { location_id: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("user_location_access")
    .delete()
    .eq("user_id", params.id)
    .eq("location_id", body.location_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.location_access.revoke",
    moduleKey: "admin",
    entityType: "user",
    entityId: params.id,
    payload: { location_id: body.location_id },
  });

  return new Response(null, { status: 204 });
}
