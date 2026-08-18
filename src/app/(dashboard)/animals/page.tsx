import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AnimalsListClient } from "@/modules/animals/components/AnimalsListClient";
import { getAllowedLocationIds } from "@/core/permissions/server";
import type { Animal } from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export default async function AnimalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const allowedIds = await getAllowedLocationIds(session.user.userId, session.user.role === "owner" || session.user.role === "admin");

  if (allowedIds !== null && allowedIds.length === 0) {
    return (
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24, fontSize: 13, color: "var(--fg-4)" }}>
        You don&apos;t have access to any location yet. Ask your admin.
      </div>
    );
  }

  const supabase = getSupabaseServerClient();

  let animalsQuery = supabase
    .from("animals")
    .select("id, organization_id, location_id, name, species, sex, status, estimated_birth_date, arrival_date, microchip_id, notes, last_vaccination_date, next_vaccination_date, vaccination_passport, created_at, updated_at, locations ( name )")
    .is("deleted_at", null)
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("name");

  let locationsQuery = supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .eq("is_active", true)
    .order("name");

  if (allowedIds !== null) {
    animalsQuery = animalsQuery.in("location_id", allowedIds);
    locationsQuery = locationsQuery.in("id", allowedIds);
  }

  const [{ data: animalsData }, { data: locationsData }] =
    await Promise.all([animalsQuery, locationsQuery]);

  type AnimalRow = { id: string; organization_id: string; location_id: string | null; name: string; species: string; sex: string | null; status: string; estimated_birth_date: string | null; arrival_date: string | null; microchip_id: string | null; notes: string | null; last_vaccination_date: string | null; next_vaccination_date: string | null; vaccination_passport: boolean; created_at: string; updated_at: string; locations: { name: string } | null };
  const animals: Animal[] = (animalsData as unknown as AnimalRow[] ?? []).map((a) => ({
    ...a,
    sex: a.sex as Animal["sex"],
    status: a.status as Animal["status"],
    location_name: a.locations?.name ?? null,
    last_vaccination_date: a.last_vaccination_date ?? null,
    next_vaccination_date: a.next_vaccination_date ?? null,
    vaccination_passport: a.vaccination_passport ?? false,
  }));

  const locations: AdminLocation[] = locationsData ?? [];

  return <AnimalsListClient initialAnimals={animals} locations={locations} />;
}
