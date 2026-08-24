import type { LoyverseCategory, LoyverseItem } from "@/modules/loyverse-sandbox/types";
import type { Account } from "./accounts";
import { loyverseFetchAll } from "./client";

const CACHE_TTL_MS = 60_000;

type CatalogCacheEntry = {
  fetchedAt: number;
  items: LoyverseItem[];
  categories: LoyverseCategory[];
  itemCategoryMap: Map<string, string | null>;
  categoryNames: Map<string, string>;
};

const catalogCache = new Map<string, CatalogCacheEntry>();

export function getCachedCatalog(account: Account): CatalogCacheEntry | null {
  const entry = catalogCache.get(account.key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt >= CACHE_TTL_MS) return null;
  return entry;
}

export function clearCatalogCache(accountKey?: string): void {
  if (accountKey) {
    catalogCache.delete(accountKey);
  } else {
    catalogCache.clear();
  }
}

export async function fetchCatalogWithCache(
  account: Account,
  opts?: { forceRefresh?: boolean; maxPages?: number },
): Promise<CatalogCacheEntry> {
  const forceRefresh = opts?.forceRefresh ?? false;
  const maxPages = opts?.maxPages ?? 10;

  if (!forceRefresh) {
    const cached = getCachedCatalog(account);
    if (cached) return cached;
  }

  const [items, categories] = await Promise.all([
    loyverseFetchAll<LoyverseItem>(account, "/items", "items", {}, { maxPages }),
    loyverseFetchAll<LoyverseCategory>(account, "/categories", "categories", {}),
  ]);

  const itemCategoryMap = new Map<string, string | null>();
  for (const item of items) {
    itemCategoryMap.set(item.id, item.category_id ?? null);
  }

  const categoryNames = new Map<string, string>();
  for (const cat of categories) {
    categoryNames.set(cat.id, cat.name);
  }

  const entry: CatalogCacheEntry = {
    fetchedAt: Date.now(),
    items,
    categories,
    itemCategoryMap,
    categoryNames,
  };

  catalogCache.set(account.key, entry);
  return entry;
}
