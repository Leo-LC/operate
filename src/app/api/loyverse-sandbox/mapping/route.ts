import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { loyverseFetch } from "@/lib/loyverse/client";
import { requireLoyverseSandboxOwner } from "@/modules/loyverse-sandbox/lib/guard";
import { LOYVERSE_STORE_TO_LOCATION } from "@/modules/loyverse-sandbox/store-mapping";
import type { LoyverseStore } from "@/modules/loyverse-sandbox/types";

export async function GET() {
  const guard = await requireLoyverseSandboxOwner();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseServerClient();

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, slug")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .order("name");

  let loyverseStores: { id: string; name: string }[] = [];
  try {
    const data = await loyverseFetch<{ stores: LoyverseStore[] }>("/stores", { limit: 50 });
    loyverseStores = (data.stores ?? []).map((s) => ({ id: s.id, name: s.name }));
  } catch {
    // stores unavailable — still return nexus locations + static mapping
  }

  const mappings = Object.entries(LOYVERSE_STORE_TO_LOCATION).map(([storeId, locationId]) => {
    const store = loyverseStores.find((s) => s.id === storeId);
    const location = (locations ?? []).find((l) => l.id === locationId);
    return {
      store_id: storeId,
      store_name: store?.name ?? null,
      location_id: locationId,
      location_name: location?.name ?? null,
      location_slug: location?.slug ?? null,
    };
  });

  const mappedStoreIds = new Set(Object.keys(LOYVERSE_STORE_TO_LOCATION));
  const unmappedStores = loyverseStores.filter((s) => !mappedStoreIds.has(s.id));

  return Response.json({
    loyverse_stores: loyverseStores,
    nexus_locations: locations ?? [],
    mappings,
    unmapped_stores: unmappedStores,
    config_file: "src/modules/loyverse-sandbox/store-mapping.ts",
  });
}
