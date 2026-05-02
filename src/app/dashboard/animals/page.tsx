import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AnimalsListClient } from "@/modules/animals/components/AnimalsListClient";
import type { Animal } from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export default async function AnimalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();
  const [{ data: animalsData }, { data: locationsData }] = await Promise.all([
    supabase
      .from("animals")
      .select("id, organization_id, location_id, name, species, sex, status, estimated_birth_date, arrival_date, microchip_id, notes, created_at, updated_at, locations ( name )")
      .is("deleted_at", null)
      .eq("organization_id", ORG_ID)
      .order("name"),
    supabase
      .from("locations")
      .select("id, name, slug, external_id, is_active, created_at")
      .eq("is_active", true)
      .order("name"),
  ]);

  type Row = { id: string; organization_id: string; location_id: string | null; name: string; species: string; sex: string | null; status: string; estimated_birth_date: string | null; arrival_date: string | null; microchip_id: string | null; notes: string | null; created_at: string; updated_at: string; locations: { name: string } | null };
  const animals: Animal[] = (animalsData as unknown as Row[] ?? []).map((a) => ({
    ...a,
    sex: a.sex as Animal["sex"],
    status: a.status as Animal["status"],
    location_name: a.locations?.name ?? null,
  }));

  const locations: AdminLocation[] = locationsData ?? [];

  return <AnimalsListClient initialAnimals={animals} locations={locations} />;
}
