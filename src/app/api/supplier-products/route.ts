import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { contact_id?: string; product_name?: string; unit?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.contact_id) return Response.json({ error: "contact_id is required" }, { status: 400 });
  if (!body.product_name?.trim()) return Response.json({ error: "product_name is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("supplier_products")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      contact_id: body.contact_id,
      product_name: body.product_name.trim(),
      unit: body.unit?.trim() || null,
      notes: body.notes?.trim() || null,
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
