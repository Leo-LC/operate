import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import type { AnimalStatus, AnimalSex } from "@/modules/animals/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  const statusFilter = searchParams.get("status");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("animals")
    .select("id, organization_id, location_id, name, species, sex, status, estimated_birth_date, arrival_date, microchip_id, notes, last_vaccination_date, next_vaccination_date, vaccination_passport, created_at, updated_at, locations ( name )")
    .is("deleted_at", null)
    .eq("organization_id", ORG_ID)
    .order("name");

  if (locationId) query = query.eq("location_id", locationId);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = { id: string; organization_id: string; location_id: string | null; name: string; species: string; sex: string | null; status: string; estimated_birth_date: string | null; arrival_date: string | null; microchip_id: string | null; notes: string | null; last_vaccination_date: string | null; next_vaccination_date: string | null; vaccination_passport: boolean; created_at: string; updated_at: string; locations: { name: string } | null };
  const mapped = (data as unknown as Row[]).map((a) => ({
    ...a,
    location_name: a.locations?.name ?? null,
    locations: undefined,
  }));

  return Response.json(mapped);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    name: string;
    species?: string;
    sex?: AnimalSex | null;
    status?: AnimalStatus;
    location_id?: string | null;
    estimated_birth_date?: string | null;
    arrival_date?: string | null;
    microchip_id?: string | null;
    notes?: string | null;
    last_vaccination_date?: string | null;
    next_vaccination_date?: string | null;
    vaccination_passport?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name?.trim()) return Response.json({ error: "name is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("animals")
    .insert({
      organization_id: ORG_ID,
      name: body.name.trim(),
      species: body.species ?? "capybara",
      sex: body.sex ?? null,
      status: body.status ?? "active",
      location_id: body.location_id ?? null,
      estimated_birth_date: body.estimated_birth_date ?? null,
      arrival_date: body.arrival_date ?? null,
      microchip_id: body.microchip_id ?? null,
      notes: body.notes ?? null,
      last_vaccination_date: body.last_vaccination_date ?? null,
      next_vaccination_date: body.next_vaccination_date ?? null,
      vaccination_passport: body.vaccination_passport ?? false,
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "animals.create",
    moduleKey: "animals",
    entityType: "animal",
    entityId: data.id,
    payload: { name: body.name, species: body.species ?? "capybara" },
  });

  return Response.json(data, { status: 201 });
}
