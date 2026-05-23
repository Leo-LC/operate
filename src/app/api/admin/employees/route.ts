import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("employees")
    .select(`
      id, organization_id, location_id, first_name, last_name, position,
      nationality, national_id, work_permit_number, work_permit_expires_at,
      email, phone, active, notes, base_salary_monthly, has_thai_bank_account,
      user_id, archived_at, created_at, updated_at,
      locations ( name ),
      employee_locations ( id, location_id, is_primary, locations ( name ) )
    `)
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .order("last_name", { ascending: true });

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type ELRow = { id: string; location_id: string; is_primary: boolean; locations: { name: string } | null };
  type EmpRow = typeof data extends (infer T)[] | null ? T : never;

  const mapped = (data ?? []).map((e) => {
    const emp = e as unknown as EmpRow & { locations: { name: string } | null; employee_locations: ELRow[] | null };
    return {
      id: emp.id,
      organization_id: emp.organization_id,
      location_id: emp.location_id ?? null,
      location_name: emp.locations?.name ?? null,
      first_name: emp.first_name,
      last_name: emp.last_name,
      position: emp.position ?? null,
      nationality: emp.nationality ?? null,
      national_id: emp.national_id ?? null,
      work_permit_number: emp.work_permit_number ?? null,
      work_permit_expires_at: emp.work_permit_expires_at ?? null,
      email: emp.email ?? null,
      phone: emp.phone ?? null,
      active: emp.active,
      notes: emp.notes ?? null,
      base_salary_monthly: emp.base_salary_monthly ?? null,
      has_thai_bank_account: emp.has_thai_bank_account ?? false,
      archived_at: emp.archived_at ?? null,
      user_id: emp.user_id ?? null,
      created_at: emp.created_at,
      updated_at: emp.updated_at,
      employee_locations: ((emp.employee_locations ?? []) as ELRow[]).map((el) => ({
        id: el.id,
        location_id: el.location_id,
        location_name: el.locations?.name ?? el.location_id,
        is_primary: el.is_primary,
      })),
    };
  });

  return Response.json(mapped);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    first_name: string;
    last_name: string;
    position?: string;
    nationality?: string;
    national_id?: string;
    work_permit_number?: string;
    work_permit_expires_at?: string;
    email?: string;
    phone?: string;
    notes?: string;
    base_salary_monthly?: number;
    has_thai_bank_account?: boolean;
    user_id?: string;
    location_ids?: string[];
    primary_location_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const first_name = body.first_name?.trim();
  const last_name = body.last_name?.trim() ?? "";
  if (!first_name) {
    return Response.json({ error: "first_name is required" }, { status: 400 });
  }

  const primaryLocationId = body.primary_location_id ?? body.location_ids?.[0] ?? null;

  const supabase = getSupabaseServerClient();
  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      location_id: primaryLocationId,
      first_name,
      last_name,
      position: body.position?.trim() ?? null,
      nationality: body.nationality?.trim() ?? null,
      national_id: body.national_id?.trim() ?? null,
      work_permit_number: body.work_permit_number?.trim() ?? null,
      work_permit_expires_at: body.work_permit_expires_at ?? null,
      email: body.email?.trim().toLowerCase() ?? null,
      phone: body.phone?.trim() ?? null,
      notes: body.notes?.trim() ?? null,
      base_salary_monthly: body.base_salary_monthly ?? null,
      has_thai_bank_account: body.has_thai_bank_account ?? false,
      user_id: body.user_id ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (body.location_ids && body.location_ids.length > 0) {
    await supabase.from("employee_locations").insert(
      body.location_ids.map((lid) => ({
        employee_id: employee.id,
        location_id: lid,
        is_primary: lid === primaryLocationId,
      }))
    );
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.create",
    moduleKey: "admin",
    entityType: "employee",
    entityId: employee.id,
    payload: { first_name, last_name, location_id: primaryLocationId },
  });

  return Response.json(employee, { status: 201 });
}
