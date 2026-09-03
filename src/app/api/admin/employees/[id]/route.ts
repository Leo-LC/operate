import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { isOperationalAdmin } from "@/core/permissions/guards";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select(`*, locations ( name ), employee_locations ( id, location_id, is_primary, base_salary_monthly, service_charge_eligible, locations ( name ) )`)
    .eq("id", params.id)
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });

  return Response.json({
    ...data,
    location_name: (data.locations as { name: string } | null)?.name ?? null,
    locations: undefined,
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: Partial<{
    first_name: string;
    last_name: string;
    position: string | null;
    nationality: string | null;
    national_id: string | null;
    work_permit_number: string | null;
    work_permit_expires_at: string | null;
    location_id: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    base_salary_monthly: number | null;
    has_thai_bank_account: boolean;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    credit_note: string | null;
    service_charge_pct: number | null;
    employment_start_date: string | null;
    employment_end_date: string | null;
    service_charge_eligible: boolean;
    active: boolean;
    user_id: string | null;
    archived_at: string | null;
    location_ids: string[];
    primary_location_id: string | null;
    location_salaries?: Record<string, number>;
    location_service_charge_eligible?: Record<string, boolean>;
  }>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.first_name !== undefined) updates.first_name = body.first_name.trim();
  if (body.last_name !== undefined) updates.last_name = body.last_name.trim();
  if ("position" in body) updates.position = body.position?.trim() ?? null;
  if ("nationality" in body) updates.nationality = body.nationality?.trim() ?? null;
  if ("national_id" in body) updates.national_id = body.national_id?.trim() ?? null;
  if ("work_permit_number" in body) updates.work_permit_number = body.work_permit_number?.trim() ?? null;
  if ("work_permit_expires_at" in body)
    updates.work_permit_expires_at = (body.work_permit_expires_at?.trim() || null);
  if ("location_id" in body) updates.location_id = body.location_id ?? null;
  if ("email" in body) updates.email = body.email?.trim().toLowerCase() ?? null;
  if ("phone" in body) updates.phone = body.phone?.trim() ?? null;
  if ("notes" in body) updates.notes = body.notes?.trim() ?? null;
  if ("base_salary_monthly" in body) updates.base_salary_monthly = body.base_salary_monthly ?? null;
  if ("has_thai_bank_account" in body) updates.has_thai_bank_account = body.has_thai_bank_account ?? false;
  if ("bank_name" in body) updates.bank_name = body.bank_name?.trim() ?? null;
  if ("bank_account_number" in body) updates.bank_account_number = body.bank_account_number?.trim().replace(/[\s-]/g, "") ?? null;
  if ("bank_account_name" in body) updates.bank_account_name = body.bank_account_name?.trim() ?? null;
  // Clear bank details when Thai bank is disabled
  if (body.has_thai_bank_account === false) {
    updates.bank_name = null;
    updates.bank_account_number = null;
    updates.bank_account_name = null;
  }
  if ("credit_note" in body) updates.credit_note = body.credit_note?.trim() ?? null;
  if ("service_charge_pct" in body) updates.service_charge_pct = body.service_charge_pct ?? null;
  if ("employment_start_date" in body) updates.employment_start_date = body.employment_start_date || null;
  if ("employment_end_date" in body) updates.employment_end_date = body.employment_end_date || null;
  if ("service_charge_eligible" in body) updates.service_charge_eligible = body.service_charge_eligible ?? true;
  if (body.active !== undefined) updates.active = body.active;
  if ("user_id" in body) updates.user_id = body.user_id ?? null;
  if ("archived_at" in body) updates.archived_at = (body.archived_at?.trim() || null);

  if ("primary_location_id" in body) updates.location_id = body.primary_location_id ?? null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Keep the primary location's salary in sync when only the legacy single
  // salary field was changed.
  if ("base_salary_monthly" in body && body.location_ids === undefined) {
    const { data: primary } = await supabase
      .from("employee_locations")
      .select("id")
      .eq("employee_id", params.id)
      .eq("is_primary", true)
      .limit(1)
      .maybeSingle();
    if (primary) {
      await supabase
        .from("employee_locations")
        .update({ base_salary_monthly: body.base_salary_monthly ?? null })
        .eq("id", primary.id);
    }
  }

  // Keep per-location eligibility in sync when only the legacy global field was changed
  // (for backward compat: single-shop edits without location_ids).
  if ("service_charge_eligible" in body && body.location_ids === undefined && body.location_service_charge_eligible === undefined) {
    await supabase
      .from("employee_locations")
      .update({ service_charge_eligible: body.service_charge_eligible ?? true })
      .eq("employee_id", params.id);
  }

  if (body.location_ids !== undefined) {
    const primaryId = body.primary_location_id ?? body.location_ids[0] ?? null;
    const locationSalaries = body.location_salaries ?? {};
    const locationEligible = body.location_service_charge_eligible ?? {};
    const primarySalary = primaryId ? locationSalaries[primaryId] : undefined;
    await supabase.from("employee_locations").delete().eq("employee_id", params.id);
    if (body.location_ids.length > 0) {
      await supabase.from("employee_locations").insert(
        body.location_ids.map((lid) => ({
          employee_id: params.id,
          location_id: lid,
          is_primary: lid === primaryId,
          base_salary_monthly: locationSalaries[lid] ?? body.base_salary_monthly ?? null,
          service_charge_eligible: locationEligible[lid] ?? ("service_charge_eligible" in body ? (body.service_charge_eligible ?? true) : true),
        }))
      );
    }
    if ("base_salary_monthly" in body || Object.keys(locationSalaries).length > 0) {
      await supabase
        .from("employees")
        .update({ base_salary_monthly: primarySalary ?? body.base_salary_monthly ?? null, updated_at: new Date().toISOString() })
        .eq("id", params.id);
    }
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.update",
    moduleKey: "admin",
    entityType: "employee",
    entityId: params.id,
    payload: updates,
  });

  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("employees")
    .update({ deleted_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("organization_id", DEFAULT_ORG_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.delete",
    moduleKey: "admin",
    entityType: "employee",
    entityId: params.id,
    payload: undefined,
  });

  return Response.json({ ok: true });
}
