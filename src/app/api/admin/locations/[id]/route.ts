import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "slug", "external_id", "is_active"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .update(updates)
    .eq("id", id)
    .select("id, name, slug, external_id, is_active, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "location.update",
    entityType: "location",
    entityId: id,
    payload: updates,
  });

  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("locations").delete().eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "location.delete",
    entityType: "location",
    entityId: id,
  });

  return new Response(null, { status: 204 });
}
