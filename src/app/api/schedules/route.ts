import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { derivePermissionsFromRole } from "@/core/permissions/guards";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("schedules")
    .select("id, organization_id, location_id, name, week_start_date, status, created_by, created_at, updated_at, locations ( name )")
    .eq("organization_id", ORG_ID)
    .is("deleted_at", null)
    .order("week_start_date", { ascending: false });

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = { id: string; organization_id: string; location_id: string; name: string; week_start_date: string; status: string; created_by: string | null; created_at: string; updated_at: string; locations: { name: string } | null };
  const mapped = (data as unknown as Row[]).map((s) => ({
    ...s,
    location_name: s.locations?.name ?? null,
    locations: undefined,
  }));

  return Response.json(mapped);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "schedules")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { name: string; location_id: string; week_start_date: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || !body.location_id || !body.week_start_date) {
    return Response.json({ error: "name, location_id, and week_start_date are required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      organization_id: ORG_ID,
      location_id: body.location_id,
      name,
      week_start_date: body.week_start_date,
      status: "draft",
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
