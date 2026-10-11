import { getSupabaseServerClient } from "@/lib/supabase-server";
import { LOYVERSE_STORE_TO_LOCATION as fallbackMap } from "@/modules/loyverse-sandbox/store-mapping";

type Mapping = {
  /** store_id → location_id (current DB mapping + code fallback history). */
  byStore: Map<string, string>;
  /** account_key → location_ids mapped in DB (for same-account inference). */
  byAccount: Map<string, Set<string>>;
};

let cached: Mapping | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

/**
 * General rule: the ONLY shops are Nexus locations (admin/locations).
 * A Loyverse store that isn't directly mapped inherits the location of its
 * account when that account maps to EXACTLY ONE location. This makes POS
 * swaps and token rotations seamless for any shop: same account, same shop,
 * never a duplicate — no per-shop migration needed for new rows.
 * Ambiguous (account shared by 2+ locations) or unknown → null, to be
 * attached explicitly in admin/locations.
 */
export function inferLocationFromAccount(
  accountKey: string | null | undefined,
  byAccount: Map<string, Set<string>>,
): string | null {
  if (!accountKey) return null;
  const locs = byAccount.get(accountKey);
  if (!locs || locs.size !== 1) return null;
  const [only] = Array.from(locs);
  return only;
}

async function loadMapping(): Promise<Mapping> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;

  const supabase = getSupabaseServerClient();
  try {
    const { data } = await supabase
      .from("locations")
      .select("id, loyverse_store_id, loyverse_account_key")
      .not("loyverse_store_id", "is", null);
    const byStore = new Map<string, string>();
    const byAccount = new Map<string, Set<string>>();
    // Fallback code map first (historical stores, e.g. retired POS).
    for (const [storeId, locId] of Object.entries(fallbackMap)) {
      byStore.set(storeId, locId);
    }
    // DB overrides / extends.
    for (const row of (data ?? []) as { id: string; loyverse_store_id: string | null; loyverse_account_key: string | null }[]) {
      if (row.loyverse_store_id) {
        byStore.set(row.loyverse_store_id, row.id);
      }
      if (row.loyverse_account_key) {
        const set = byAccount.get(row.loyverse_account_key) ?? new Set<string>();
        set.add(row.id);
        byAccount.set(row.loyverse_account_key, set);
      }
    }
    cached = { byStore, byAccount };
    cachedAt = now;
    return cached;
  } catch {
    // Fallback to code map only.
    return {
      byStore: new Map<string, string>(Object.entries(fallbackMap)),
      byAccount: new Map(),
    };
  }
}

export async function getLocationIdForStoreAsync(storeId: string, accountKey?: string): Promise<string | null> {
  const map = await loadMapping();
  return map.byStore.get(storeId) ?? inferLocationFromAccount(accountKey, map.byAccount);
}

export function getLocationIdForStoreSync(storeId: string): string | null {
  // Sync fallback for cases where async not possible (keep compat)
  return fallbackMap[storeId] ?? null;
}

export async function getStoreIdForLocationAsync(locationId: string): Promise<string | null> {
  const map = await loadMapping();
  for (const [storeId, locId] of Array.from(map.byStore.entries())) {
    if (locId === locationId) return storeId;
  }
  return null;
}

export function clearStoreMappingCache() {
  cached = null;
  cachedAt = 0;
}
