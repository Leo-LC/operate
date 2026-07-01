import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select(`*, locations ( name ), employee_locations ( id, location_id, is_primary, locations ( name ) )`)
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
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

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
    credit_note: string | null;
    service_charge_pct: number | null;
    active: boolean;
    user_id: string | null;
    archived_at: string | null;
    location_ids: string[];
    primary_location_id: string | null;
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
  if ("credit_note" in body) updates.credit_note = body.credit_note?.trim() ?? null;
  if ("service_charge_pct" in body) updates.service_charge_pct = body.service_charge_pct ?? null;
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

  if (body.location_ids !== undefined) {
    const primaryId = body.primary_location_id ?? body.location_ids[0] ?? null;
    await supabase.from("employee_locations").delete().eq("employee_id", params.id);
    if (body.location_ids.length > 0) {
      await supabase.from("employee_locations").insert(
        body.location_ids.map((lid) => ({
          employee_id: params.id,
          location_id: lid,
          is_primary: lid === primaryId,
        }))
      );
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
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

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
