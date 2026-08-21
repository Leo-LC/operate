/**
 * Alpha mapping: Loyverse store_id → Nexus locations.id (UUID).
 * Fill in after probing GET /stores in the API Explorer.
 *
 * Example:
 * "42dc2cec-6f40-11ea-bde9-1269e7c5a22d": "your-location-uuid-here",
 */
export const LOYVERSE_STORE_TO_LOCATION: Record<string, string> = {
  // Add mappings here after running the stores probe
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
