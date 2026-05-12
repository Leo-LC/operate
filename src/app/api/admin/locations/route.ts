import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at, updated_at, address_en, address_th, phone, vat_number, google_maps_url, notes")
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, slug, external_id, is_active = true, address_en, address_th, phone, vat_number, google_maps_url, notes } = body;

  if (!name?.trim()) return Response.json({ error: "name is required" }, { status: 400 });
  if (!slug?.trim()) return Response.json({ error: "slug is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      name: name.trim(),
      slug: slug.trim(),
      external_id: external_id?.trim() || null,
      is_active,
      address_en: address_en?.trim() || null,
      address_th: address_th?.trim() || null,
      phone: phone?.trim() || null,
      vat_number: vat_number?.trim() || null,
      google_maps_url: google_maps_url?.trim() || null,
      notes: notes?.trim() || null,
    })
    .select("id, name, slug, external_id, is_active, created_at, updated_at, address_en, address_th, phone, vat_number, google_maps_url, notes")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "location.create",
    entityType: "location",
    entityId: data.id,
    payload: { name, slug },
  });

  return Response.json(data, { status: 201 });
}
