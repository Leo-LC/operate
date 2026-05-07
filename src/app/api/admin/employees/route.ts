import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

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
      email, phone, active, notes, user_id, archived_at, created_at, updated_at,
      locations ( name ),
      employee_locations ( id, location_id, is_primary, locations ( name ) )
    `)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .order("last_name", { ascending: true });

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data ?? []);
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
  const last_name = body.last_name?.trim();
  if (!first_name || !last_name) {
    return Response.json({ error: "first_name and last_name are required" }, { status: 400 });
  }

  const primaryLocationId = body.primary_location_id ?? body.location_ids?.[0] ?? null;

  const supabase = getSupabaseServerClient();
  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      organization_id: ORG_ID,
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
