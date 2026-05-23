import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const locationId = searchParams.get("location_id");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("employee_payment_records")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  if (year) query = query.eq("period_year", parseInt(year));
  if (month) query = query.eq("period_month", parseInt(month));
  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    location_id: string;
    employee_id: string;
    period_year: number;
    period_month: number;
    scheduled_hours?: number;
    missed_hours?: number;
    hourly_rate_snapshot?: number;
    base_salary?: number;
    deductions?: number;
    deduction_note?: string;
    overtime_pay?: number;
    service_charge?: number;
    service_charge_is_manual?: boolean;
    bonus_amount?: number;
    bonus_note?: string;
    payment_method?: string;
    status?: string;
    notes?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.location_id || !body.employee_id || !body.period_year || !body.period_month) {
    return Response.json({ error: "location_id, employee_id, period_year, period_month required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("employee_payment_records").upsert({
    organization_id: DEFAULT_ORG_ID,
    location_id: body.location_id,
    employee_id: body.employee_id,
    period_year: body.period_year,
    period_month: body.period_month,
    scheduled_hours: body.scheduled_hours ?? 0,
    missed_hours: body.missed_hours ?? 0,
    hourly_rate_snapshot: body.hourly_rate_snapshot ?? 0,
    base_salary: body.base_salary ?? 0,
    deductions: body.deductions ?? 0,
    deduction_note: body.deduction_note ?? null,
    overtime_pay: body.overtime_pay ?? 0,
    service_charge: body.service_charge ?? 0,
    service_charge_is_manual: body.service_charge_is_manual ?? false,
    bonus_amount: body.bonus_amount ?? 0,
    bonus_note: body.bonus_note ?? null,
    payment_method: body.payment_method ?? "cash",
    status: body.status ?? "draft",
    notes: body.notes ?? null,
    created_by: session.user.userId ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "employee_id,period_year,period_month" }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
