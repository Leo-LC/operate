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

  if (!location_id) {
    return Response.json({ error: "location_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("finance_cost_rules")
    .select("id, label, category, cadence, estimated_amount, custom_allocations, is_active")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("scope_type", "location")
    .eq("location_id", location_id)
    .eq("is_active", true)
    .neq("category", "legacy_fixed_expenses")
    .order("category")
    .order("label");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    costs: data ?? [],
    canManage: session.user.role === "owner",
  });
}