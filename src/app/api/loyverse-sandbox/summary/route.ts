import { getDefaultAccount } from "@/lib/loyverse/accounts";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCatalogWithCache } from "@/lib/loyverse/catalog-cache";
import { loyverseFetchAll, LoyverseApiError } from "@/lib/loyverse/client";
import { requireLoyverseSandboxOwner } from "@/modules/loyverse-sandbox/lib/guard";
import {
  aggregateReceipts,
  buildFieldDiffs,
  computeCoverage,
  dateRangeForDay,
} from "@/modules/loyverse-sandbox/lib/aggregate-receipts";
import { getLocationIdForStore } from "@/modules/loyverse-sandbox/store-mapping";
import type { LoyverseReceipt } from "@/modules/loyverse-sandbox/types";

export async function GET(request: Request) {
  const guard = await requireLoyverseSandboxOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const storeId = url.searchParams.get("store_id");

  if (!date || !storeId) {
    return Response.json({ error: "date and store_id are required" }, { status: 400 });
  }

  const account = getDefaultAccount();
  if (!account) {
    return Response.json({ error: "Loyverse account not configured" }, { status: 503 });
  }

  try {
    const range = dateRangeForDay(date);
    const locationIdEarly = getLocationIdForStore(storeId);
    const supabaseEarly = getSupabaseServerClient();
    let isSamuiEarly = false;
    try {
      const { data: samuiLocs } = await supabaseEarly.from("locations").select("id, name, slug").or("name.ilike.%samui%,slug.ilike.%samui%");
      const samuiIds = new Set((samuiLocs ?? []).map((r) => (r as { id: string }).id));
      if (locationIdEarly && samuiIds.has(locationIdEarly)) isSamuiEarly = true;
    } catch {}
    const [receipts, catalog] = await Promise.all([
      loyverseFetchAll<LoyverseReceipt>(account, "/receipts", "receipts", {
        store_id: storeId,
        created_at_min: range.created_at_min,
        created_at_max: range.created_at_max,
      }),
      fetchCatalogWithCache(account),
    ]);

    const { itemCategoryMap, categoryNames } = catalog;
    const { proposed, challenges, meta } = aggregateReceipts(
      receipts,
      date,
      storeId,
      itemCategoryMap,
      categoryNames,
      { isSamui: isSamuiEarly },
    );

    const locationId = locationIdEarly;
    const supabase = supabaseEarly;

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
