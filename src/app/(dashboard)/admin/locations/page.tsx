import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { LocationsClient } from "@/modules/admin/components/LocationsClient";
import { LoyverseAccountsCard } from "@/modules/admin/components/LoyverseAccountsCard";
import type { AdminLocation } from "@/modules/admin/types";

export default async function AdminLocationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!["owner", "admin"].includes(session.user.role ?? "")) redirect("/home");

  const supabase = getSupabaseServerClient();
  const [{ data: locations }, { data: employees }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name, slug, external_id, is_active, created_at, updated_at, address_en, address_th, phone, vat_number, google_maps_url, google_sheet_id, notes, default_service_charge_pct, loyverse_store_id, loyverse_account_key")
      .order("name"),
    supabase
      .from("employees")
      .select("id, first_name, last_name, position, location_id, active")
      .eq("active", true)
      .order("first_name"),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <LoyverseAccountsCard />
      <LocationsClient
        initialLocations={(locations ?? []) as AdminLocation[]}
        employees={employees ?? []}
      />
    </div>
  );
}
