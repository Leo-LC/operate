import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner, requireFinanceRead } from "@/modules/finance/server";

const CATEGORIES = new Set(["rent", "utilities", "marketing", "support_workers", "other"]);

export async function GET(request: Request) {
  const auth = await requireFinanceRead();
  if (auth.error) return auth.error;
  const locationId = new URL(request.url).searchParams.get("location_id");
  const supabase = getSupabaseServerClient();
  let query = supabase.from("finance_cost_rules").select("*").eq("organization_id", DEFAULT_ORG_ID).neq("category", "legacy_fixed_expenses").order("created_at", { ascending: false });
  if (locationId) query = query.eq("location_id", locationId);
  const [{ data: locations, error: locationsError }, { data, error }, { data: employees, error: employeesError }] = await Promise.all([
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    query,
    supabase.from("employees").select("id, location_id, base_salary_monthly, employee_locations(location_id, base_salary_monthly)").eq("organization_id", DEFAULT_ORG_ID).eq("active", true).is("deleted_at", null),
  ]);
  if (error ?? locationsError ?? employeesError) return Response.json({ error: (error ?? locationsError ?? employeesError)?.message }, { status: 500 });
  const salaries: Record<string, number> = {};
  for (const employee of employees ?? []) {
    const assignments = (employee.employee_locations as { location_id: string; base_salary_monthly: number | null }[] | null) ?? [];
    if (assignments.length > 0) {
      for (const assignment of assignments) {
        salaries[assignment.location_id] = (salaries[assignment.location_id] ?? 0) + Number(assignment.base_salary_monthly ?? employee.base_salary_monthly ?? 0);
      }
    } else if (employee.location_id) {
      salaries[employee.location_id] = (salaries[employee.location_id] ?? 0) + Number(employee.base_salary_monthly ?? 0);
    }
  }
  return Response.json({ locations: locations ?? [], costs: data ?? [], salaries, canManage: auth.permissions.global_role === "owner" });
}

export async function POST(request: Request) {
  const auth = await requireFinanceOwner();
  if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const category = String(body.category ?? "");
  const supportType = body.support_type ? String(body.support_type) : null;
  const label = category === "support_workers" ? `Support workers · ${supportType === "bookings" ? "Bookings" : supportType === "social_media_and_bookings" ? "Social media + bookings" : "Social media"}` : category.charAt(0).toUpperCase() + category.slice(1);
  const amount = Number(body.estimated_amount); const locationId = body.location_id ? String(body.location_id) : null;
  const amountMode = body.amount_mode === "variable" ? "variable" : "fixed";
  if (!locationId || !CATEGORIES.has(category) || !Number.isFinite(amount) || amount < 0) return Response.json({ error: "Choose a shop, category and valid amount" }, { status: 400 });
  const effectiveFrom = `${new Date().toISOString().slice(0, 7)}-01`;
  const reason = "Saved from the simplified recurring costs register";
  const supabase = getSupabaseServerClient();
  const result = await supabase.from("finance_cost_rules").insert({ organization_id: DEFAULT_ORG_ID, label, category, scope_type: "location", location_id: locationId, cadence: "monthly", estimated_amount: amount, effective_from: effectiveFrom, allocation_method: "direct", custom_allocations: { amount_mode: amountMode, support_type: supportType }, reason, created_by: auth.session.user.userId ?? null, updated_by: auth.session.user.userId ?? null }).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await supabase.from("finance_audit_events").insert({ organization_id: DEFAULT_ORG_ID, user_id: auth.session.user.userId ?? null, action: "finance.recurring_cost.create", entity_type: "finance_cost_rule", entity_id: result.data.id, reason, payload: body });
  return Response.json(result.data, { status: 201 });
}
