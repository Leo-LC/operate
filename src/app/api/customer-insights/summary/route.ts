import { aggregateFormResponses } from "@/modules/customer-insights/lib/aggregate";
import {
  fetchFormResponses,
  isCustomerInsightsConfigured,
} from "@/modules/customer-insights/lib/fetch-sheet";
import { requireCustomerInsightsOwner } from "@/modules/customer-insights/lib/guard";
import type { CustomerInsightsSummary } from "@/modules/customer-insights/types";

function emptySummary(
  filters: { from: string | null; to: string | null; shop: string },
  configured: boolean,
  error?: string,
): CustomerInsightsSummary {
  return {
    totalSubmissions: 0,
    byShop: [],
    byChannel: [],
    topCountries: [],
    byWeek: [],
    unmatched: { shops: [], channels: [], countries: [] },
    meta: {
      configured,
      dateRange: { min: null, max: null },
      shops: [],
      lastFetchedAt: new Date().toISOString(),
      filtered: filters,
      error,
    },
  };
}

export async function GET(request: Request) {
  const guard = await requireCustomerInsightsOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const shop = url.searchParams.get("shop") ?? "all";

  const filters = { from, to, shop };
  const configured = await isCustomerInsightsConfigured();

  if (!configured) {
    return Response.json(
      emptySummary(
        filters,
        false,
        "Google account not linked. Sign in with Google to connect spreadsheet access.",
      ),
    );
  }

  try {
    const rows = await fetchFormResponses();
    const summary = aggregateFormResponses(rows, filters, {
      configured: true,
      lastFetchedAt: new Date().toISOString(),
    });
    return Response.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load customer insights";
    return Response.json(emptySummary(filters, true, message), { status: 502 });
  }
}
