import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner } from "@/modules/finance/server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireFinanceOwner(); if (auth.error) return auth.error;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const reason = String(body.reason ?? "").trim(); if (!reason) return Response.json({ error: "A reason is required" }, { status: 400 });
  const allowed = ["label", "category", "cadence", "estimated_amount", "effective_from", "effective_to", "is_active", "notes"];
  const updates: Record<string, unknown> = Object.fromEntries(allowed.filter((key) => key in body).map((key) => [key, body[key] === "" ? null : body[key]]));
  Object.assign(updates, { reason, updated_by: auth.session.user.userId ?? null, updated_at: new Date().toISOString() });
  const supabase = getSupabaseServerClient(); const result = await supabase.from("finance_cost_rules").update(updates).eq("id", params.id).eq("organization_id", DEFAULT_ORG_ID).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await supabase.from("finance_audit_events").insert({ organization_id: DEFAULT_ORG_ID, user_id: auth.session.user.userId ?? null, action: "finance.recurring_cost.update", entity_type: "finance_cost_rule", entity_id: params.id, reason, payload: updates });
  return Response.json(result.data);
}
