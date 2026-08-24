import { getSupabaseServerClient } from "@/lib/supabase-server";
import { LOYVERSE_STORE_TO_LOCATION as fallbackMap } from "@/modules/loyverse-sandbox/store-mapping";

let cached: Map<string, string> | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

async function loadMapping(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;

  const supabase = getSupabaseServerClient();
  try {
    const { data } = await supabase.from("locations").select("id, loyverse_store_id").not("loyverse_store_id", "is", null);
    const map = new Map<string, string>();
    // Fallback code map first
    for (const [storeId, locId] of Object.entries(fallbackMap)) {
      map.set(storeId, locId);
    }
    // DB overrides / extends
    for (const row of (data ?? []) as { id: string; loyverse_store_id: string | null }[]) {
      if (row.loyverse_store_id) {
        map.set(row.loyverse_store_id, row.id);
      }
    }
    cached = map;
    cachedAt = now;
    return map;
  } catch {
    // Fallback to code map only
    const map = new Map<string, string>(Object.entries(fallbackMap));
    return map;
  }
}

export async function getLocationIdForStoreAsync(storeId: string): Promise<string | null> {
  const map = await loadMapping();
  return map.get(storeId) ?? null;
}

export function getLocationIdForStoreSync(storeId: string): string | null {
  // Sync fallback for cases where async not possible (keep compat)
  return fallbackMap[storeId] ?? null;
}

export async function getStoreIdForLocationAsync(locationId: string): Promise<string | null> {
  const map = await loadMapping();
  for (const [storeId, locId] of Array.from(map.entries())) {
    if (locId === locationId) return storeId;
  }
  return null;
}

export function clearStoreMappingCache() {
  cached = null;
  cachedAt = 0;
}
