import { getSupabaseServerClient } from "@/lib/supabase-server";

interface AuditParams {
  userId: string | null;
  action: string;
  moduleKey?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.from("audit_logs").insert({
    user_id: params.userId,
    action: params.action,
    module_key: params.moduleKey ?? null,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    payload: params.payload ?? null,
  });
}
