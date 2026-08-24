import { getDefaultAccount } from "@/lib/loyverse/accounts";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCatalogWithCache } from "@/lib/loyverse/catalog-cache";
import { loyverseFetchAll, LoyverseApiError } from "@/lib/loyverse/client";
import { requireLoyverseSandboxOwner } from "@/modules/loyverse-sandbox/lib/guard";
import {
  aggregateReceipts,
  computeCoverage,
  dateRangeForDay,
  lastNDates,
} from "@/modules/loyverse-sandbox/lib/aggregate-receipts";
import { getLocationIdForStore } from "@/modules/loyverse-sandbox/store-mapping";
import type { DemoReportResult, LoyverseReceipt } from "@/modules/loyverse-sandbox/types";

export async function GET(request: Request) {
  const guard = await requireLoyverseSandboxOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const storeId = url.searchParams.get("store_id");
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days") ?? "7")));

  if (!storeId) {
    return Response.json({ error: "store_id is required" }, { status: 400 });
  }

  const account = getDefaultAccount();
  if (!account) {
    return Response.json({ error: "Loyverse account not configured" }, { status: 503 });
  }

  try {
    const dates = lastNDates(days);
    const minDate = dates[dates.length - 1];
    const maxDate = dates[0];
    const rangeStart = dateRangeForDay(minDate).created_at_min;
    const rangeEnd = dateRangeForDay(maxDate).created_at_max;

    const [receipts, catalog] = await Promise.all([
      loyverseFetchAll<LoyverseReceipt>(account, "/receipts", "receipts", {
        store_id: storeId,
        created_at_min: rangeStart,
        created_at_max: rangeEnd,
      }),
      fetchCatalogWithCache(account),
    ]);

    const { itemCategoryMap, categoryNames } = catalog;
    const coverage = computeCoverage();

    const locationId = getLocationIdForStore(storeId);
    const supabase = getSupabaseServerClient();
    let locationName: string | null = null;
    let existingDates = new Set<string>();

    if (locationId) {
      const [locRes, entriesRes] = await Promise.all([
        supabase.from("locations").select("name").eq("id", locationId).maybeSingle(),
        supabase
          .from("daily_entries")
          .select("entry_date")
          .eq("location_id", locationId)
          .in("entry_date", dates),
      ]);
      locationName = locRes.data?.name ?? null;
      existingDates = new Set((entriesRes.data ?? []).map((e) => e.entry_date as string));
    }

    const dayResults = dates.map((date) => {
      const { meta } = aggregateReceipts(
        receipts,
        date,
        storeId,
        itemCategoryMap,
        categoryNames,
      );
      return {
        date,
        coverage_percent: coverage.percent,
        receipt_count: meta.receipt_count,
        has_existing_entry: existingDates.has(date),
      };
    });

    const averageCoverage =
      dayResults.length > 0
        ? Math.round(dayResults.reduce((s, d) => s + d.coverage_percent, 0) / dayResults.length)
        : 0;

    const result: DemoReportResult = {
      store_id: storeId,
      location_id: locationId,
      location_name: locationName,
      days: dayResults,
      average_coverage_percent: averageCoverage,
      challenges_automated: [
        "Receipt count → entry_count",
        "Snack quantity → snacks_sold",
        "Sales categories → sales gate & merchandising %",
        "Payment splits → accounting reconciliation",
      ],
    };

    return Response.json(result);
  } catch (err) {
    const message = err instanceof LoyverseApiError ? err.message : "Demo report failed";
    const status = err instanceof LoyverseApiError ? err.status : 502;
    return Response.json({ error: message }, { status: status >= 500 ? 502 : status });
  }
}
