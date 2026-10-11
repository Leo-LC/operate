/**
 * Alpha mapping: Loyverse store_id → Nexus locations.id (UUID).
 * Fill in after probing GET /stores in the API Explorer.
 *
 * Historical stores (old POS replaced by a new one, same shop) map to the
 * same location so future syncs keep attaching to the shop and the dashboard
 * (grouped per location) shows ONE card with continuous history.
 *
 * Example:
 * "42dc2cec-6f40-11ea-bde9-1269e7c5a22d": "your-location-uuid-here",
 */
export const LOYVERSE_STORE_TO_LOCATION: Record<string, string> = {
  // Pattaya old POS (closed 2026-10-11, still listed by /stores) → same shop.
  // Location UUID = locations.slug 'pattaya' (see 20261011000002 migration).
  "5b36d7b8-d523-475e-ad60-c7318538acec": "fff86d70-3ea4-4908-9115-65748cc82be3",
};

export function getLocationIdForStore(storeId: string): string | null {
  return LOYVERSE_STORE_TO_LOCATION[storeId] ?? null;
}

export function getStoreIdForLocation(locationId: string): string | null {
  for (const [storeId, locId] of Object.entries(LOYVERSE_STORE_TO_LOCATION)) {
    if (locId === locationId) return storeId;
  }
  return null;
}
