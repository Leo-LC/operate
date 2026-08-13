import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { isOperationalAdmin } from "@/core/permissions/guards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: { location_id: string; is_primary?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.location_id) return Response.json({ error: "location_id required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("employee_locations").upsert(
    { employee_id: id, location_id: body.location_id, is_primary: body.is_primary ?? false },
    { onConflict: "employee_id,location_id" }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  if (!locationId) return Response.json({ error: "location_id query param required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("employee_locations")
    .delete()
    .eq("employee_id", id)
    .eq("location_id", locationId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
