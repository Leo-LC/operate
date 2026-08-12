import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner, requireFinanceRead } from "@/modules/finance/server";

const CATEGORIES = new Set(["rent", "water", "electricity", "marketing", "accounting", "insurance", "subscriptions", "other"]);
const CADENCES = new Set(["monthly", "annual", "one_off"]);

export async function GET(request: Request) {
  const auth = await requireFinanceRead();
  if (auth.error) return auth.error;
  const locationId = new URL(request.url).searchParams.get("location_id");
  const supabase = getSupabaseServerClient();
  let query = supabase.from("finance_cost_rules").select("*, finance_cost_actuals(*)").eq("organization_id", DEFAULT_ORG_ID).order("effective_from", { ascending: false });
  if (locationId) query = query.eq("location_id", locationId);
  const [{ data: locations, error: locationsError }, { data, error }] = await Promise.all([
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"), query,
  ]);
  if (error ?? locationsError) return Response.json({ error: (error ?? locationsError)?.message }, { status: 500 });
  return Response.json({ locations: locations ?? [], costs: data ?? [], canManage: auth.permissions.global_role === "owner" });
}

export async function POST(request: Request) {
  const auth = await requireFinanceOwner();
  if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const category = String(body.category ?? ""); const cadence = String(body.cadence ?? "");
  const reason = String(body.reason ?? "").trim(); const label = String(body.label ?? "").trim();
  const amount = Number(body.estimated_amount); const locationId = body.location_id ? String(body.location_id) : null;
  if (!label || !reason || !CATEGORIES.has(category) || !CADENCES.has(cadence) || !Number.isFinite(amount) || amount < 0 || !body.effective_from) return Response.json({ error: "Complete all required fields with valid values" }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const result = await supabase.from("finance_cost_rules").insert({ organization_id: DEFAULT_ORG_ID, label, category, scope_type: locationId ? "location" : "group", location_id: locationId, cadence, estimated_amount: amount, effective_from: body.effective_from, effective_to: body.effective_to || null, allocation_method: "direct", notes: body.notes || null, reason, created_by: auth.session.user.userId ?? null, updated_by: auth.session.user.userId ?? null }).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  if (body.actual_amount !== undefined && body.actual_amount !== "") {
    const actual = Number(body.actual_amount);
    if (!Number.isFinite(actual) || actual < 0 || !body.service_from || !body.service_to) return Response.json({ error: "Actual amount requires a valid service period" }, { status: 400 });
    const actualResult = await supabase.from("finance_cost_actuals").insert({ organization_id: DEFAULT_ORG_ID, cost_rule_id: result.data.id, service_from: body.service_from, service_to: body.service_to, amount: actual, reason, notes: body.notes || null, created_by: auth.session.user.userId ?? null });
    if (actualResult.error) return Response.json({ error: actualResult.error.message }, { status: 500 });
  }
  await supabase.from("finance_audit_events").insert({ organization_id: DEFAULT_ORG_ID, user_id: auth.session.user.userId ?? null, action: "finance.recurring_cost.create", entity_type: "finance_cost_rule", entity_id: result.data.id, reason, payload: body });
  return Response.json(result.data, { status: 201 });
}
