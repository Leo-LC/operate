import { getSupabaseServerClient } from "@/lib/supabase-server";
import { loyverseFetchAll, LoyverseApiError } from "@/lib/loyverse/client";
import { requireLoyverseSandboxOwner } from "@/modules/loyverse-sandbox/lib/guard";
import {
  aggregateReceipts,
  buildFieldDiffs,
  buildItemCategoryMap,
  computeCoverage,
  dateRangeForDay,
} from "@/modules/loyverse-sandbox/lib/aggregate-receipts";
import { getLocationIdForStore } from "@/modules/loyverse-sandbox/store-mapping";
import type {
  LoyverseCategory,
  LoyverseItem,
  LoyverseReceipt,
} from "@/modules/loyverse-sandbox/types";

export async function GET(request: Request) {
  const guard = await requireLoyverseSandboxOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const storeId = url.searchParams.get("store_id");

  if (!date || !storeId) {
    return Response.json({ error: "date and store_id are required" }, { status: 400 });
  }

  try {
    const range = dateRangeForDay(date);
    const [receipts, items, categories] = await Promise.all([
      loyverseFetchAll<LoyverseReceipt>("/receipts", "receipts", {
        store_id: storeId,
        created_at_min: range.created_at_min,
        created_at_max: range.created_at_max,
      }),
      loyverseFetchAll<LoyverseItem>("/items", "items", {}, { maxPages: 10 }),
      loyverseFetchAll<LoyverseCategory>("/categories", "categories", {}),
    ]);

    const itemCategoryMap = buildItemCategoryMap(items);
    const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
    const { proposed, challenges, meta } = aggregateReceipts(
      receipts,
      date,
      storeId,
      itemCategoryMap,
      categoryNames,
    );

    const locationId = getLocationIdForStore(storeId);
    const supabase = getSupabaseServerClient();

    let existingEntry: Record<string, number | string | null> | null = null;
    let locationName: string | null = null;

    if (locationId) {
      const [entryRes, locRes] = await Promise.all([
        supabase
          .from("daily_entries")
          .select("*")
          .eq("location_id", locationId)
          .eq("entry_date", date)
          .maybeSingle(),
        supabase
          .from("locations")
          .select("name")
          .eq("id", locationId)
          .maybeSingle(),
      ]);
      existingEntry = entryRes.data ?? null;
      locationName = locRes.data?.name ?? null;
    }

    const fieldDiffs = buildFieldDiffs(proposed, existingEntry);
    const coverage = computeCoverage();

    return Response.json({
      date,
      store_id: storeId,
      location_id: locationId,
      location_name: locationName,
      proposed,
      challenges,
      meta,
      existing_entry: existingEntry,
      field_diffs: fieldDiffs,
      coverage,
    });
  } catch (err) {
    const message = err instanceof LoyverseApiError ? err.message : "Summary failed";
    const status = err instanceof LoyverseApiError ? err.status : 502;
    return Response.json({ error: message }, { status: status >= 500 ? 502 : status });
  }
}
