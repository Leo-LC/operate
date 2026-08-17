import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const location_id = searchParams.get("location_id");
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  if (!location_id) {
    return Response.json({ error: "location_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [rulesResult, actualsResult] = await Promise.all([
    supabase
      .from("finance_cost_rules")
      .select("id, label, category, cadence, estimated_amount, custom_allocations, is_active")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("scope_type", "location")
      .eq("location_id", location_id)
      .eq("is_active", true)
      .neq("category", "legacy_fixed_expenses")
      .order("category")
      .order("label"),
    supabase
      .from("finance_cost_actuals")
      .select("cost_rule_id, service_from, amount")
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("service_from", from)
      .lte("service_from", to),
  ]);

  if (rulesResult.error) return Response.json({ error: rulesResult.error.message }, { status: 500 });
  if (actualsResult.error) return Response.json({ error: actualsResult.error.message }, { status: 500 });

  const actuals: Record<string, Record<number, number>> = {};
  for (const row of actualsResult.data ?? []) {
    const month = Number(String(row.service_from).slice(5, 7));
    if (Number.isFinite(month)) {
      actuals[row.cost_rule_id] = actuals[row.cost_rule_id] ?? {};
      actuals[row.cost_rule_id][month] = Number(row.amount);
    }
  }

  return Response.json({
    costs: rulesResult.data ?? [],
    actuals,
    canManage: session.user.role === "owner",
  });
}