import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "admin"].includes(session.user.role ?? "")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, user_id, action, module_key, payload, created_at, users ( email )")
    .eq("action", "auth.login")
    .eq("module_key", "auth")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type LogRow = {
    id: string; user_id: string | null; action: string; module_key: string | null;
    payload: Record<string, unknown> | null; created_at: string; users: { email: string } | null;
  };
  const mapped = (data as unknown as LogRow[] ?? []).map((log) => ({
    id: log.id,
    user_id: log.user_id,
    user_email: (log.payload as { email?: string } | null)?.email ?? log.users?.email ?? null,
    provider: (log.payload as { provider?: string } | null)?.provider ?? null,
    role: (log.payload as { role?: string } | null)?.role ?? null,
    created_at: log.created_at,
  }));

  return Response.json(mapped);
}
