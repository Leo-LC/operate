import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import type { AnimalStatus, AnimalSex } from "@/modules/animals/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const [{ data: animal, error }, { data: events }] = await Promise.all([
    supabase
      .from("animals")
      .select("id, organization_id, location_id, name, species, sex, status, estimated_birth_date, arrival_date, microchip_id, notes, created_at, updated_at, locations ( name )")
      .eq("id", params.id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("animal_events")
      .select("id, animal_id, event_type, event_date, title, notes, created_at")
      .eq("animal_id", params.id)
      .order("event_date", { ascending: false }),
  ]);

  if (error || !animal) return Response.json({ error: "Animal not found" }, { status: 404 });

  type AnimalRow = { locations: { name: string } | null } & Record<string, unknown>;
  const mapped = { ...(animal as unknown as AnimalRow), location_name: (animal as unknown as AnimalRow).locations?.name ?? null, locations: undefined };

  return Response.json({ animal: mapped, events: events ?? [] });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    name?: string;
    species?: string;
    sex?: AnimalSex | null;
    status?: AnimalStatus;
    location_id?: string | null;
    estimated_birth_date?: string | null;
    arrival_date?: string | null;
    microchip_id?: string | null;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = ["name","species","sex","status","location_id","estimated_birth_date","arrival_date","microchip_id","notes"] as const;
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("animals")
    .update(updates)
    .eq("id", params.id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !data) return Response.json({ error: "Animal not found or update failed" }, { status: 404 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "animals.update",
    moduleKey: "animals",
    entityType: "animal",
    entityId: params.id,
    payload: updates,
  });

  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("animals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id)
    .is("deleted_at", null);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "animals.delete",
    moduleKey: "animals",
    entityType: "animal",
    entityId: params.id,
  });

  return new Response(null, { status: 204 });
}
