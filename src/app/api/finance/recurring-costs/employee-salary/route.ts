import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireFinanceOwner } from "@/modules/finance/server";

export async function PATCH(request: Request) {
  const auth = await requireFinanceOwner(); if (auth.error) return auth.error;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const employeeId = String(body.employee_id ?? "");
  const locationId = String(body.location_id ?? "");
  const amount = Number(body.base_salary_monthly);
  const reason = String(body.reason ?? "Salary edited from the recurring costs payroll").trim();
  if (!employeeId || !locationId || !Number.isFinite(amount) || amount < 0) {
    return Response.json({ error: "Employee, location and a valid salary are required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const userId = auth.session.user.userId ?? null;

  // Fetch the employee's existing assignment for this location so we can
  // keep is_primary intact and sync the legacy salary field when needed.
  const { data: existing } = await supabase
    .from("employee_locations")
    .select("id, is_primary")
    .eq("employee_id", employeeId)
    .eq("location_id", locationId)
    .maybeSingle();

  const upsert = await supabase.from("employee_locations").upsert(
    { employee_id: employeeId, location_id: locationId, is_primary: existing?.is_primary ?? false, base_salary_monthly: amount },
    { onConflict: "employee_id,location_id" },
  ).select().single();
  if (upsert.error) return Response.json({ error: upsert.error.message }, { status: 500 });

  if (existing?.is_primary) {
    await supabase.from("employees").update({
      base_salary_monthly: amount,
      updated_at: new Date().toISOString(),
    }).eq("id", employeeId).eq("organization_id", DEFAULT_ORG_ID);
  }

  await supabase.from("finance_audit_events").insert({
    organization_id: DEFAULT_ORG_ID, user_id: userId, action: "finance.payroll.salary_update",
    entity_type: "employee", entity_id: employeeId, reason, payload: { location_id: locationId, base_salary_monthly: amount },
  });

  return Response.json({ ok: true });
}