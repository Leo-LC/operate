import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import type { FixedExpenseCategory, MonthlyFixedExpense } from "@/modules/accounting/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const location_id = searchParams.get("location_id");
  const year = parseInt(searchParams.get("year") ?? "", 10);

  if (!location_id || !year || isNaN(year)) {
    return Response.json({ error: "location_id and year are required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("monthly_fixed_expenses")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("location_id", location_id)
    .eq("year", year)
    .order("month");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ rows: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const { location_id, year, month } = body;

  if (!location_id || typeof location_id !== "string")
    return Response.json({ error: "location_id required" }, { status: 400 });
  if (!year || typeof year !== "number" || year < 2000 || year > 2100)
    return Response.json({ error: "Invalid year" }, { status: 400 });
  if (!month || typeof month !== "number" || month < 1 || month > 12)
    return Response.json({ error: "Invalid month (1–12)" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  // Fetch active categories to whitelist allowed keys
  const { data: cats } = await supabase
    .from("fixed_expense_categories")
    .select("key")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true);

  const allowedKeys = new Set((cats ?? []).map((c) => (c as FixedExpenseCategory).key));

  // Build category_values from body — only allow known keys
  const category_values: Record<string, number> = {};
  const raw = (body.category_values as Record<string, unknown>) ?? body;
  for (const [k, v] of Object.entries(raw)) {
    if (allowedKeys.has(k)) {
      category_values[k] = typeof v === "number" ? v : parseFloat(String(v)) || 0;
    }
  }

  const { data, error } = await supabase
    .from("monthly_fixed_expenses")
    .upsert(
      {
        organization_id: DEFAULT_ORG_ID,
        location_id,
        year,
        month,
        category_values,
        updated_at: new Date().toISOString(),
        created_by: session.user.userId ?? null,
      },
      { onConflict: "location_id,year,month" }
    )
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "accounting.fixed_expense.upsert",
    moduleKey: "accounting",
    entityType: "monthly_fixed_expenses",
    entityId: (data as MonthlyFixedExpense).id,
    payload: { location_id, year, month, category_values },
  });

  return Response.json(data);
}
