import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const locationId = searchParams.get("location_id");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("contacts")
    .select(`
      id, organization_id, name, contact_type, company, email, phone, address, notes,
      created_by, created_at, updated_at,
      contact_locations ( id, location_id, locations ( name ) )
    `)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (type) query = query.eq("contact_type", type);
  if (locationId) query = query.eq("contact_locations.location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    name: string;
    contact_type: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    location_ids?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name?.trim()) return Response.json({ error: "name is required" }, { status: 400 });
  if (!body.contact_type) return Response.json({ error: "contact_type is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: ORG_ID,
      name: body.name.trim(),
      contact_type: body.contact_type,
      company: body.company?.trim() ?? null,
      email: body.email?.trim().toLowerCase() ?? null,
      phone: body.phone?.trim() ?? null,
      address: body.address?.trim() ?? null,
      notes: body.notes?.trim() ?? null,
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (body.location_ids && body.location_ids.length > 0) {
    await supabase.from("contact_locations").insert(
      body.location_ids.map((lid) => ({ contact_id: contact.id, location_id: lid }))
    );
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "contacts.create",
    moduleKey: "contacts",
    entityType: "contact",
    entityId: contact.id,
    payload: { name: body.name, contact_type: body.contact_type },
  });

  return Response.json(contact, { status: 201 });
}
