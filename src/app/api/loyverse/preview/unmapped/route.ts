import { getAccounts } from "@/lib/loyverse/accounts";
import { fetchCatalogWithCache } from "@/lib/loyverse/catalog-cache";
import { loyverseFetchAll } from "@/lib/loyverse/client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseOwner } from "@/modules/loyverse/lib/guard";
import { dateRangeForDay } from "@/modules/loyverse-sandbox/lib/aggregate-receipts";
import { resolvePaymentBucket, resolveSalesBucket } from "@/modules/loyverse-sandbox/mapping-config";
import type { LoyverseReceipt } from "@/modules/loyverse-sandbox/types";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const guard = await requireLoyverseOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? bangkokToday();
  const storeFilter = url.searchParams.get("store_id");

  const supabase = getSupabaseServerClient();

  // Determine which stores to inspect: from snapshots for date, or all stores of default account if no snapshots
  const { data: snapshots } = await supabase.from("loyverse_daily_snapshots").select("account_key, store_id, location_id").eq("date", date);
  const storeEntries: { account_key: string; store_id: string; location_id: string | null }[] =
    (snapshots ?? [])
      .filter((s) => !storeFilter || s.store_id === storeFilter)
      .map((s) => ({ account_key: s.account_key as string, store_id: s.store_id as string, location_id: s.location_id as string | null }));

  // If no snapshots, fallback to default account stores (still show frequencies live)
  let fallbackAccounts: typeof storeEntries = [];
  if (storeEntries.length === 0 && !storeFilter) {
    const accounts = getAccounts();
    for (const acc of accounts.slice(0, 1)) {
      // fetch stores live for fallback
      const { fetchCatalogWithCache: _unused } = await import("@/lib/loyverse/catalog-cache");
      void _unused;
      const { loyverseFetch } = await import("@/lib/loyverse/client");
      try {
        const data = await loyverseFetch<{ stores: { id: string }[] }>(acc, "/stores", { limit: 50 });
        for (const s of data.stores ?? []) {
          fallbackAccounts.push({ account_key: acc.key, store_id: s.id, location_id: null });
        }
      } catch {
        // ignore
      }
    }
  }
  const toInspect = storeEntries.length > 0 ? storeEntries : fallbackAccounts;

  if (toInspect.length === 0) {
    return Response.json({ date, per_store: [], top_unmapped_items: [], top_unmapped_payments: [] });
  }

  // Group by account for catalog batching
  const byAccount = new Map<string, typeof toInspect>();
  for (const e of toInspect) {
    const arr = byAccount.get(e.account_key) ?? [];
    arr.push(e);
    byAccount.set(e.account_key, arr);
  }

  const globalItemFreq = new Map<string, { key: string; name: string | null; category: string | null; count: number; example_store: string }>();
  const globalPaymentFreq = new Map<string, { key: string; type: string | null; name: string | null; count: number; example_store: string }>();
  const perStore: Array<{
    account_key: string;
    store_id: string;
    location_id: string | null;
    receipt_count: number;
    unmapped_line_items: number;
    unmapped_payments: number;
    top_items: { name: string | null; category: string | null; count: number }[];
    top_payments: { type: string | null; name: string | null; count: number }[];
  }> = [];

  for (const [accountKey, entries] of Array.from(byAccount.entries())) {
    const account = getAccounts().find((a) => a.key === accountKey);
    if (!account) continue;
    let catalog: Awaited<ReturnType<typeof fetchCatalogWithCache>> | null = null;
    try {
      catalog = await fetchCatalogWithCache(account);
    } catch {
      continue;
    }
    const range = dateRangeForDay(date);

    for (const entry of entries) {
      try {
        const receipts = await loyverseFetchAll<LoyverseReceipt>(account, "/receipts", "receipts", {
          store_id: entry.store_id,
          created_at_min: range.created_at_min,
          created_at_max: range.created_at_max,
        });

        const itemFreq = new Map<string, number>();
        const itemMeta = new Map<string, { name: string | null; category: string | null }>();
        const payFreq = new Map<string, number>();
        const payMeta = new Map<string, { type: string | null; name: string | null }>();
        let unmappedItems = 0;
        let unmappedPays = 0;
        let receiptCount = 0;

        for (const receipt of receipts) {
          if (receipt.cancelled_at) continue;
          receiptCount++;
          for (const line of receipt.line_items ?? []) {
            const catId = line.item_id ? (catalog.itemCategoryMap.get(line.item_id) ?? null) : null;
            const catName = catId ? (catalog.categoryNames.get(catId) ?? null) : null;
            const bucket = resolveSalesBucket(catId, catName, line.item_name ?? null);
            if (bucket === "other") {
              unmappedItems++;
              const key = `${catName ?? ""}||${line.item_name ?? ""}`.toLowerCase();
              itemFreq.set(key, (itemFreq.get(key) ?? 0) + 1);
              if (!itemMeta.has(key)) itemMeta.set(key, { name: line.item_name ?? null, category: catName });
              globalItemFreq.set(key, {
                key,
                name: line.item_name ?? null,
                category: catName,
                count: (globalItemFreq.get(key)?.count ?? 0) + 1,
                example_store: entry.store_id,
              });
            }
          }
          for (const pay of receipt.payments ?? []) {
            const bucket = resolvePaymentBucket(pay.type ?? null, pay.name ?? null);
            if (bucket === "other") {
              unmappedPays++;
              const key = `${pay.type ?? ""}||${pay.name ?? ""}`.toLowerCase();
              payFreq.set(key, (payFreq.get(key) ?? 0) + 1);
              if (!payMeta.has(key)) payMeta.set(key, { type: pay.type ?? null, name: pay.name ?? null });
              globalPaymentFreq.set(key, {
                key,
                type: pay.type ?? null,
                name: pay.name ?? null,
                count: (globalPaymentFreq.get(key)?.count ?? 0) + 1,
                example_store: entry.store_id,
              });
            }
          }
        }

        const topItems = Array.from(itemFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([k, count]) => ({ ...itemMeta.get(k)!, count }));
        const topPays = Array.from(payFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([k, count]) => ({ ...payMeta.get(k)!, count }));

        perStore.push({
          account_key: entry.account_key,
          store_id: entry.store_id,
          location_id: entry.location_id,
          receipt_count: receiptCount,
          unmapped_line_items: unmappedItems,
          unmapped_payments: unmappedPays,
          top_items: topItems,
          top_payments: topPays,
        });
      } catch {
        perStore.push({
          account_key: entry.account_key,
          store_id: entry.store_id,
          location_id: entry.location_id,
          receipt_count: 0,
          unmapped_line_items: 0,
          unmapped_payments: 0,
          top_items: [],
          top_payments: [],
        });
      }
    }
  }

  const topUnmappedItems = Array.from(globalItemFreq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  const topUnmappedPayments = Array.from(globalPaymentFreq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return Response.json({
    date,
    per_store: perStore,
    top_unmapped_items: topUnmappedItems,
    top_unmapped_payments: topUnmappedPayments,
  });
}
