import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { AnimalDetailClient } from "@/modules/animals/components/AnimalDetailClient";
import type { Animal, AnimalEvent } from "@/modules/animals/types";
import type { AdminLocation } from "@/modules/admin/types";

export default async function AnimalDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();
  const [{ data: animalData, error }, { data: eventsData }, { data: locationsData }] =
    await Promise.all([
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
      supabase
        .from("locations")
        .select("id, name, slug, external_id, is_active, created_at")
        .eq("is_active", true)
        .order("name"),
    ]);

  if (error || !animalData) notFound();

  type AnimalRow = { locations: { name: string } | null } & Record<string, unknown>;
  const row = animalData as unknown as AnimalRow;
  const animal: Animal = {
    ...(row as unknown as Animal),
    location_name: row.locations?.name ?? null,
  };

  const events: AnimalEvent[] = (eventsData ?? []).map((e) => ({
    ...e,
    event_type: e.event_type as AnimalEvent["event_type"],
  }));

  const locations: AdminLocation[] = locationsData ?? [];

  return <AnimalDetailClient animal={animal} initialEvents={events} locations={locations} />;
}
