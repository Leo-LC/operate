import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getUserPermissionsFromDb } from "@/core/permissions/server";

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (permissions.global_role !== "owner") return { error: Response.json({ error: "Owner access required" }, { status: 403 }) };
  return { session };
}

async function audit(userId: string | null, action: string, entityId: string | null, reason: string, payload: Record<string, unknown>) {
  await getSupabaseServerClient().from("finance_audit_events").insert({
    organization_id: DEFAULT_ORG_ID,
    user_id: userId,
    action,
    entity_type: "shop_monthly_input",
    entity_id: entityId,
    reason,
    payload,
  });
}

export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const supabase = getSupabaseServerClient();
  const [locations, inputs] = await Promise.all([
    supabase.from("locations").select("id,name").eq("organization_id", DEFAULT_ORG_ID).eq("is_active", true).order("name"),
    supabase.from("finance_shop_monthly_inputs").select("*").eq("organization_id", DEFAULT_ORG_ID).order("period_year", { ascending: false }).order("period_month", { ascending: false }),
  ]);
  const error = locations.error ?? inputs.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ locations: locations.data ?? [], monthlyInputs: inputs.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const reason = String(body.reason ?? "").trim();
  const locationId = String(body.location_id ?? "");
  const periodYear = Number(body.period_year);
  const periodMonth = Number(body.period_month);
  if (!reason || !locationId || !Number.isInteger(periodYear) || !Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    return Response.json({ error: "Shop, mois et motif sont requis" }, { status: 400 });
  }

  const numericFields = ["salaries_amount", "rent_amount", "electricity_amount", "water_amount", "other_fixed_amount", "service_charge_rate_pct", "employee_count"] as const;
  const values = Object.fromEntries(numericFields.map((field) => [field, Number(body[field] ?? 0)]));
  if (Object.values(values).some((value) => !Number.isFinite(value) || value < 0)) return Response.json({ error: "Les montants doivent être positifs" }, { status: 400 });
  if (values.service_charge_rate_pct > 100 || !Number.isInteger(values.employee_count)) return Response.json({ error: "Taux invalide ou nombre d’employés non entier" }, { status: 400 });

  const now = new Date().toISOString();
  const result = await getSupabaseServerClient().from("finance_shop_monthly_inputs").upsert({
    organization_id: DEFAULT_ORG_ID,
    location_id: locationId,
    period_year: periodYear,
    period_month: periodMonth,
    ...values,
    reason,
    created_by: auth.session.user.userId ?? null,
    updated_by: auth.session.user.userId ?? null,
    updated_at: now,
  }, { onConflict: "organization_id,location_id,period_year,period_month" }).select().single();
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  await audit(auth.session.user.userId ?? null, "finance.shop_monthly_input.upsert", result.data.id, reason, { location_id: locationId, period_year: periodYear, period_month: periodMonth, ...values });
  return Response.json(result.data, { status: 201 });
}
