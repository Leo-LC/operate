/**
 * Generates/refreshes payment records for a period + location.
 * POST body: { period_year, period_month, location_id }
 *
 * Every employee at the location gets a payment record whose base_salary
 * snapshots their current base_salary_monthly and whose service_charge is
 * the location's net revenue for the period times the employee's
 * service_charge_pct (falling back to the location's default). Manual
 * adjustments (payment_adjustments) are untouched by this — they're keyed
 * off the record id, which upsert preserves.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "payments")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { period_year: number; period_month: number; location_id: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { period_year, period_month, location_id } = body;
  if (!period_year || !period_month || !location_id) {
    return Response.json({ error: "period_year, period_month, location_id required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const monthPad = String(period_month).padStart(2, "0");
  const lastDay = new Date(period_year, period_month, 0).getDate();
  const fromDate = `${period_year}-${monthPad}-01`;
  const toDate   = `${period_year}-${monthPad}-${String(lastDay).padStart(2, "0")}`;

  const [empRes, dailyRes, locRes, existingRes] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, base_salary_monthly, has_thai_bank_account, service_charge_pct, location_id, employee_locations(location_id)")
      .eq("organization_id", DEFAULT_ORG_ID)
      .is("archived_at", null)
      .is("deleted_at", null),
    supabase
      .from("daily_entries")
      .select("sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, sales_card_surcharge")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("location_id", location_id)
      .gte("entry_date", fromDate)
      .lte("entry_date", toDate),
    supabase
      .from("locations")
      .select("default_service_charge_pct")
      .eq("id", location_id)
      .single(),
    supabase
      .from("employee_payment_records")
      .select("employee_id, notes, payment_method")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("location_id", location_id)
      .eq("period_year", period_year)
      .eq("period_month", period_month),
  ]);

  const defaultPct = locRes.data?.default_service_charge_pct ?? 1;
  const existingMap = new Map((existingRes.data ?? []).map((r) => [r.employee_id as string, r]));

  const totalNetRevenue = (dailyRes.data ?? []).reduce((sum, row) => {
    return sum + (row.sales_drinks_net ?? 0) + (row.sales_ticket_net ?? 0) +
           (row.sales_snack_net ?? 0) + (row.sales_goodies_net ?? 0) + (row.sales_card_surcharge ?? 0);
  }, 0);

  const locationEmployees = (empRes.data ?? []).filter((e) => {
    const locs = (e.employee_locations as { location_id: string }[] | null) ?? [];
    return locs.some((el) => el.location_id === location_id) || e.location_id === location_id;
  });

  const upsertRows = locationEmployees.map((emp) => {
    const pct = (emp.service_charge_pct as number | null) ?? defaultPct;
    const existing = existingMap.get(emp.id);
    return {
      organization_id: DEFAULT_ORG_ID,
      location_id,
      employee_id: emp.id,
      period_year,
      period_month,
      base_salary: (emp.base_salary_monthly as number | null) ?? 0,
      service_charge: Math.round(totalNetRevenue * (pct / 100) * 100) / 100,
      payment_method: existing?.payment_method ?? ((emp.has_thai_bank_account as boolean) ? "bank_transfer" : "cash"),
      notes: existing?.notes ?? null,
      created_by: session.user.userId ?? null,
      updated_at: new Date().toISOString(),
    };
  });

  const { data: saved, error: upsertErr } = await supabase
    .from("employee_payment_records")
    .upsert(upsertRows, { onConflict: "employee_id,period_year,period_month" })
    .select("*, adjustments:payment_adjustments(*)");

  if (upsertErr) return Response.json({ error: upsertErr.message }, { status: 500 });
  return Response.json(saved ?? []);
}
