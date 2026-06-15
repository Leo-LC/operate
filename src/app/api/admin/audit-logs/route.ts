import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset = Number(searchParams.get("offset") ?? "0");
  const entityId = searchParams.get("entity_id");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("audit_logs")
    .select("id, user_id, action, module_key, entity_type, entity_id, payload, created_at, users ( email )")
    .order("created_at", { ascending: false });
  if (entityId) query = query.eq("entity_id", entityId);
  else query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type LogRow = {
    id: string; user_id: string | null; action: string; module_key: string | null;
    entity_type: string | null; entity_id: string | null; payload: Record<string, unknown> | null;
    created_at: string; users: { email: string } | null;
  };
  const mapped = (data as unknown as LogRow[] ?? []).map((log) => ({
    id: log.id,
    user_id: log.user_id,
    user_email: log.users?.email ?? null,
    action: log.action,
    module_key: log.module_key,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    payload: log.payload,
    created_at: log.created_at,
  }));

  return Response.json(mapped);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before"); // YYYY-MM-DD
  if (!before) return Response.json({ error: "Missing ?before= parameter" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase
    .from("audit_logs")
    .delete({ count: "exact" })
    .lt("created_at", new Date(before).toISOString());

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ deleted: count ?? 0 });
}
