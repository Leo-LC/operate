import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AuditLogsClient } from "@/modules/admin/components/AuditLogsClient";
import type { AuditLogEntry } from "@/modules/admin/types";

export default async function AdminAuditLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, user_id, action, module_key, entity_type, entity_id, payload, created_at, users ( email )")
    .order("created_at", { ascending: false })
    .limit(500);

  type LogRow = {
    id: string; user_id: string | null; action: string; module_key: string | null;
    entity_type: string | null; entity_id: string | null; payload: Record<string, unknown> | null;
    created_at: string; users: { email: string } | null;
  };
  const logs: AuditLogEntry[] = (data as unknown as LogRow[] ?? []).map((log) => ({
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

  return <AuditLogsClient logs={logs} />;
}
