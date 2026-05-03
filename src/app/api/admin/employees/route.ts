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
    .select("id, organization_id, location_id, first_name, last_name, position, email, phone, active, notes, user_id, created_at, updated_at, locations ( name )")
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .order("last_name", { ascending: true });

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = { id: string; organization_id: string; location_id: string | null; first_name: string; last_name: string; position: string | null; email: string | null; phone: string | null; active: boolean; notes: string | null; user_id: string | null; created_at: string; updated_at: string; locations: { name: string } | null };
  const mapped = (data as unknown as Row[]).map((e) => ({
    ...e,
    location_name: e.locations?.name ?? null,
    locations: undefined,
  }));

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
    location_id?: string;
    email?: string;
    phone?: string;
    notes?: string;
    user_id?: string;
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

  const supabase = getSupabaseServerClient();
  const { data: employee, error } = await supabase
    .from("employees")
    .insert({
      organization_id: ORG_ID,
      location_id: body.location_id ?? null,
      first_name,
      last_name,
      position: body.position?.trim() ?? null,
      email: body.email?.trim().toLowerCase() ?? null,
      phone: body.phone?.trim() ?? null,
      notes: body.notes?.trim() ?? null,
      user_id: body.user_id ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.create",
    moduleKey: "admin",
    entityType: "employee",
    entityId: employee.id,
    payload: { first_name, last_name, location_id: body.location_id ?? null },
  });

  return Response.json(employee, { status: 201 });
}
