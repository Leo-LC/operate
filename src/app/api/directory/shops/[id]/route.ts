import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: Partial<Record<string, string | null>>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowed = [
    "phone", "line_id", "address_en", "address_th",
    "company_name_th", "tax_id", "branch",
    "opening_hours", "manager_name", "notes",
  ];
  const updates: Record<string, string | null> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) {
      const v = body[key];
      updates[key] = typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
    }
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", DEFAULT_ORG_ID)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
