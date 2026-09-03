import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner, requireFinanceRead } from "@/modules/finance/server";

const DEFAULT_CATEGORIES = new Set(["rent", "utilities", "marketing", "support_workers", "other"]);
const CATEGORY_LABELS: Record<string, string> = { rent: "Rent", utilities: "Utilities", marketing: "Marketing", support_workers: "Support workers", other: "Accounting" };

function normalizeCategory(value: string): string | null {
  const slug = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 32);
  if (!slug || slug.length < 2) return null;
  if (!/^[a-z]/.test(slug)) return null;
  return slug;
}

function labelForCategory(value: string): string {
  if (CATEGORY_LABELS[value]) return CATEGORY_LABELS[value];
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(request: Request) {
  const auth = await requireFinanceRead();
  if (auth.error) return auth.error;
  const locationId = new URL(request.url).searchParams.get("location_id");
  const supabase = getSupabaseServerClient();
  let query = supabase.from("finance_cost_rules").select("*").eq("organization_id", DEFAULT_ORG_ID).neq("category", "legacy_fixed_expenses").order("created_at", { ascending: false });
  if (locationId) query = query.eq("location_id", locationId);
  let categoriesResult: { data: { slug: string; label: string }[] | null; error: unknown } = { data: null, error: null };
  try {
    const res = await supabase.from("finance_cost_categories").select("slug,label").eq("organization_id", DEFAULT_ORG_ID).order("label");
    categoriesResult = res as unknown as typeof categoriesResult;
  } catch { categoriesResult = { data: null, error: null }; }
  const [{ data: locations, error: locationsError }, { data, error }, { data: employees, error: employeesError }] = await Promise.all([
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    query,
    supabase.from("employees").select("id, first_name, last_name, position, location_id, base_salary_monthly, employee_locations(location_id, base_salary_monthly)").eq("organization_id", DEFAULT_ORG_ID).eq("active", true).is("deleted_at", null),
  ]);
  if (error ?? locationsError ?? employeesError) return Response.json({ error: (error ?? locationsError ?? employeesError)?.message }, { status: 500 });
  const salaries: Record<string, number> = {};
  const employeeList = locationId ? [] as Array<{ id: string; name: string; position: string | null; base_salary_monthly: number }> : null;
  for (const employee of employees ?? []) {
    const assignments = (employee.employee_locations as { location_id: string; base_salary_monthly: number | null }[] | null) ?? [];
    const locationSalary = (locId: string) => {
      const assignment = assignments.find((a) => a.location_id === locId);
      return assignment ? Number(assignment.base_salary_monthly ?? employee.base_salary_monthly ?? 0) : Number(employee.base_salary_monthly ?? 0);
    };
    if (assignments.length > 0) {
      for (const assignment of assignments) {
        salaries[assignment.location_id] = (salaries[assignment.location_id] ?? 0) + Number(assignment.base_salary_monthly ?? employee.base_salary_monthly ?? 0);
      }
    } else if (employee.location_id) {
      salaries[employee.location_id] = (salaries[employee.location_id] ?? 0) + Number(employee.base_salary_monthly ?? 0);
    }
    if (employeeList !== null && locationId) {
      const isAssignedHere = assignments.some((a) => a.location_id === locationId) || employee.location_id === locationId;
      if (isAssignedHere) {
        employeeList.push({
          id: employee.id,
          name: [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim() || "Unnamed employee",
          position: employee.position ?? null,
          base_salary_monthly: locationSalary(locationId),
        });
      }
    }
  }
  employeeList?.sort((a, b) => a.name.localeCompare(b.name));
  // Build categories list: defaults + distinct from costs + explicit registry
  const distinctFromCosts = new Set((data ?? []).map((r: { category: string }) => r.category));
  const registry = categoriesResult.data ?? [];
  const categorySet = new Set<string>([...Array.from(DEFAULT_CATEGORIES), ...Array.from(distinctFromCosts), ...registry.map((r) => r.slug)]);
  const categories = Array.from(categorySet).map((value) => {
    const reg = registry.find((r) => r.slug === value);
    return { value, label: reg?.label ?? CATEGORY_LABELS[value] ?? labelForCategory(value) };
  }).sort((a, b) => a.label.localeCompare(b.label));
  const canManage = auth.permissions.global_role === "owner" || auth.permissions.global_role === "admin";
  return Response.json({ locations: locations ?? [], costs: data ?? [], salaries, employees: employeeList ?? [], categories, canManage });
}

export async function POST(request: Request) {
  const auth = await requireFinanceOwner();
  if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  let category = String(body.category ?? "").trim().toLowerCase();
  // Handle custom category creation
  if (body.custom_category) {
    const normalized = normalizeCategory(String(body.custom_category));
    if (!normalized) return Response.json({ error: "Invalid custom category name" }, { status: 400 });
    category = normalized;
    // Persist new category globally if not exists
    const supabaseCat = getSupabaseServerClient();
    const customLabel = String(body.custom_label ?? body.custom_category).trim() || labelForCategory(category);
    await supabaseCat.from("finance_cost_categories").upsert({ organization_id: DEFAULT_ORG_ID, slug: category, label: customLabel }, { onConflict: "organization_id,slug" });
  } else {
    const normalized = normalizeCategory(category);
    if (!normalized) return Response.json({ error: "Choose a shop, category and valid amount" }, { status: 400 });
    category = normalized;
  }
  const supportType = body.support_type ? String(body.support_type) : null;
  const label = category === "support_workers" ? `Support workers · ${supportType === "bookings" ? "Bookings" : supportType === "social_media_and_bookings" ? "Social media + bookings" : "Social media"}` : labelForCategory(category);
  const amount = Number(body.estimated_amount); const locationId = body.location_id ? String(body.location_id) : null;
  const amountMode = body.amount_mode === "variable" ? "variable" : "fixed";
  if (!locationId || !Number.isFinite(amount) || amount < 0) return Response.json({ error: "Choose a shop, category and valid amount" }, { status: 400 });
  // Validate category: allow any normalized slug, but ensure it exists in registry or defaults or just created
  // No strict set check anymore — custom categories are allowed
  const effectiveFrom = `${new Date().toISOString().slice(0, 7)}-01`;
  const reason = "Saved from the simplified recurring costs register";
  const supabase = getSupabaseServerClient();
  const result = await supabase.from("finance_cost_rules").insert({ organization_id: DEFAULT_ORG_ID, label, category, scope_type: "location", location_id: locationId, cadence: "monthly", estimated_amount: amount, effective_from: effectiveFrom, allocation_method: "direct", custom_allocations: { amount_mode: amountMode, support_type: supportType }, reason, created_by: auth.session.user.userId ?? null, updated_by: auth.session.user.userId ?? null }).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await supabase.from("finance_audit_events").insert({ organization_id: DEFAULT_ORG_ID, user_id: auth.session.user.userId ?? null, action: "finance.recurring_cost.create", entity_type: "finance_cost_rule", entity_id: result.data.id, reason, payload: body });
  return Response.json(result.data, { status: 201 });
}
