import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(`*, contact_locations ( id, location_id, locations ( name ) )`)
    .eq("id", params.id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json(data);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Partial<{
    name: string;
    contact_type: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    location_ids: string[];
  }>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.contact_type !== undefined) updates.contact_type = body.contact_type;
  if ("company" in body) updates.company = body.company?.trim() ?? null;
  if ("email" in body) updates.email = body.email?.trim().toLowerCase() ?? null;
  if ("phone" in body) updates.phone = body.phone?.trim() ?? null;
  if ("address" in body) updates.address = body.address?.trim() ?? null;
  if ("notes" in body) updates.notes = body.notes?.trim() ?? null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (body.location_ids !== undefined) {
    await supabase.from("contact_locations").delete().eq("contact_id", params.id);
    if (body.location_ids.length > 0) {
      await supabase.from("contact_locations").insert(
        body.location_ids.map((lid) => ({ contact_id: params.id, location_id: lid }))
      );
    }
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "contacts.update",
    moduleKey: "contacts",
    entityType: "contact",
    entityId: params.id,
    payload: updates,
  });

  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("contacts")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("organization_id", ORG_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "contacts.delete",
    moduleKey: "contacts",
    entityType: "contact",
    entityId: params.id,
    payload: undefined,
  });

  return Response.json({ ok: true });
}
