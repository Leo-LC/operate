import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner } from "@/modules/finance/server";

function monthBounds(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { from, to };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireFinanceOwner(); if (auth.error) return auth.error;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const reason = String(body.reason ?? "").trim(); if (!reason) return Response.json({ error: "A reason is required" }, { status: 400 });
  const year = Number(body.year); const month = Number(body.month); const amount = Number(body.amount);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isFinite(amount) || amount < 0) {
    return Response.json({ error: "Valid year, month and amount are required" }, { status: 400 });
  }
  const { from, to } = monthBounds(year, month);
  const supabase = getSupabaseServerClient();
  const userId = auth.session.user.userId ?? null;

  const result = await supabase.from("finance_cost_actuals").upsert(
    { organization_id: DEFAULT_ORG_ID, cost_rule_id: params.id, service_from: from, service_to: to, amount, reason, created_by: userId, updated_by: userId },
    { onConflict: "cost_rule_id,service_from,service_to" },
  ).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });

  const { data: rule } = await supabase
    .from("finance_cost_rules").select("custom_allocations")
    .eq("id", params.id).eq("organization_id", DEFAULT_ORG_ID).maybeSingle();
  await supabase.from("finance_cost_rules").update({
    custom_allocations: { ...((rule?.custom_allocations ?? {}) as Record<string, unknown>), amount_mode: "variable" },
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }).eq("id", params.id).eq("organization_id", DEFAULT_ORG_ID);

  await supabase.from("finance_audit_events").insert({
    organization_id: DEFAULT_ORG_ID, user_id: userId, action: "finance.recurring_cost.month_override",
    entity_type: "finance_cost_rule", entity_id: params.id, reason, payload: { year, month, amount },
  });

  return Response.json(result.data);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireFinanceOwner(); if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")); const month = Number(searchParams.get("month"));
  const reason = searchParams.get("reason") ?? "Override cleared from accounting Fixed Costs";
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return Response.json({ error: "Valid year and month are required" }, { status: 400 });
  }
  const { from, to } = monthBounds(year, month);
  const supabase = getSupabaseServerClient();
  const userId = auth.session.user.userId ?? null;

  const result = await supabase.from("finance_cost_actuals").delete()
    .eq("organization_id", DEFAULT_ORG_ID).eq("cost_rule_id", params.id)
    .eq("service_from", from).eq("service_to", to);
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });

  const { data: remaining, error: remainingError } = await supabase
    .from("finance_cost_actuals").select("id").eq("organization_id", DEFAULT_ORG_ID).eq("cost_rule_id", params.id).limit(1);
  if (remainingError) return Response.json({ error: remainingError.message }, { status: 500 });
  if ((remaining ?? []).length === 0) {
    const { data: rule } = await supabase
      .from("finance_cost_rules").select("custom_allocations")
      .eq("id", params.id).eq("organization_id", DEFAULT_ORG_ID).maybeSingle();
    await supabase.from("finance_cost_rules").update({
      custom_allocations: { ...((rule?.custom_allocations ?? {}) as Record<string, unknown>), amount_mode: "fixed" },
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", params.id).eq("organization_id", DEFAULT_ORG_ID);
  }

  await supabase.from("finance_audit_events").insert({
    organization_id: DEFAULT_ORG_ID, user_id: userId, action: "finance.recurring_cost.month_override_delete",
    entity_type: "finance_cost_rule", entity_id: params.id, reason, payload: { year, month },
  });

  return Response.json({ ok: true });
}