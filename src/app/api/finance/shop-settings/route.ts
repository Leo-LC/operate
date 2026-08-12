import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner, requireFinanceRead } from "@/modules/finance/server";

export async function GET() {
  const auth = await requireFinanceRead(); if (auth.error) return auth.error;
  const supabase = getSupabaseServerClient();
  const [locations, settings, employees, costs] = await Promise.all([
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_shop_settings").select("*").eq("organization_id", DEFAULT_ORG_ID),
    supabase.from("employees").select("location_id").eq("organization_id", DEFAULT_ORG_ID).eq("active", true).is("deleted_at", null),
    supabase.from("finance_cost_rules").select("location_id,estimated_amount,custom_allocations").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).neq("category", "legacy_fixed_expenses"),
  ]);
  const error = locations.error ?? settings.error ?? employees.error ?? costs.error; if (error) return Response.json({ error: error.message }, { status: 500 });
  const summaries = Object.fromEntries((locations.data ?? []).map((location) => [location.id, {
    employeeCount: (employees.data ?? []).filter((employee) => employee.location_id === location.id).length,
    recurringMonthly: (costs.data ?? []).filter((cost) => cost.location_id === location.id).reduce((sum, cost) => sum + Number(cost.estimated_amount ?? 0), 0),
  }]));
  return Response.json({ locations: locations.data ?? [], settings: settings.data ?? [], summaries, canManage: auth.permissions.global_role === "owner" });
}

export async function POST(request: Request) {
  const auth = await requireFinanceOwner(); if (auth.error) return auth.error;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const locationId = String(body.location_id ?? ""); const reason = "Saved from simplified shop settings"; const rate = Number(body.service_charge_rate_pct ?? 0);
  if (!locationId || !Number.isFinite(rate) || rate < 0 || rate > 100) return Response.json({ error: "Shop and valid rate are required" }, { status: 400 });
  const supabase = getSupabaseServerClient(); const now = new Date().toISOString();
  const result = await supabase.from("finance_shop_settings").upsert({ organization_id: DEFAULT_ORG_ID, location_id: locationId, service_charge_rate_pct: rate, common_settings: { currency: "THB" }, reason, created_by: auth.session.user.userId ?? null, updated_by: auth.session.user.userId ?? null, updated_at: now }, { onConflict: "organization_id,location_id" }).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await supabase.from("finance_audit_events").insert({ organization_id: DEFAULT_ORG_ID, user_id: auth.session.user.userId ?? null, action: "finance.shop_settings.upsert", entity_type: "finance_shop_settings", entity_id: result.data.id, reason, payload: body });
  return Response.json(result.data, { status: 201 });
}
