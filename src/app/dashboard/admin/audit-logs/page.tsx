import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
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
    .limit(100);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Audit Logs</h1>
        <span className="text-sm text-muted-foreground">Last {logs.length} entries</span>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Actor</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Entity</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {log.user_email ?? <span className="text-muted-foreground/50">system</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {log.entity_type ? `${log.entity_type}` : "—"}
                    {log.entity_id && (
                      <span className="ml-1 font-mono text-[10px]">
                        {log.entity_id.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground max-w-xs truncate">
                    {log.payload ? JSON.stringify(log.payload) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
