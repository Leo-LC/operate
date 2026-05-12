import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { LocationsClient } from "@/modules/admin/components/LocationsClient";
import type { AdminLocation } from "@/modules/admin/types";

export default async function AdminLocationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();
  const [{ data: locations }, { data: employees }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name, slug, external_id, is_active, created_at, updated_at, address_en, address_th, phone, vat_number, google_maps_url, notes")
      .order("name"),
    supabase
      .from("employees")
      .select("id, first_name, last_name, position, location_id, active")
      .eq("active", true)
      .order("first_name"),
  ]);

  return (
    <LocationsClient
      initialLocations={(locations ?? []) as AdminLocation[]}
      employees={employees ?? []}
    />
  );
}
