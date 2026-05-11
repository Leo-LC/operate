import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AnimalsListClient } from "@/modules/animals/components/AnimalsListClient";
import type { Animal } from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export default async function AnimalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();
  const [{ data: animalsData }, { data: locationsData }] = await Promise.all([
    supabase
      .from("animals")
      .select("id, organization_id, location_id, name, species, sex, status, estimated_birth_date, arrival_date, microchip_id, notes, last_vaccination_date, next_vaccination_date, vaccination_passport, created_at, updated_at, locations ( name )")
      .is("deleted_at", null)
      .eq("organization_id", DEFAULT_ORG_ID)
      .order("name"),
    supabase
      .from("locations")
      .select("id, name, slug, external_id, is_active, created_at")
      .eq("is_active", true)
      .order("name"),
  ]);

  type Row = { id: string; organization_id: string; location_id: string | null; name: string; species: string; sex: string | null; status: string; estimated_birth_date: string | null; arrival_date: string | null; microchip_id: string | null; notes: string | null; last_vaccination_date: string | null; next_vaccination_date: string | null; vaccination_passport: boolean; created_at: string; updated_at: string; locations: { name: string } | null };
  const animals: Animal[] = (animalsData as unknown as Row[] ?? []).map((a) => ({
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
