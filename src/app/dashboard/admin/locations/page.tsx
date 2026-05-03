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
  const { data } = await supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .order("name");

  const locations: AdminLocation[] = data ?? [];

  return <LocationsClient initialLocations={locations} />;
}
