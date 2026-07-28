import { startOfWeek, format } from "date-fns";
import { buildChannelChartBuckets } from "../normalize/channel";
import { getCanonicalShops } from "../normalize/shop";
import { OTHER_REVIEW } from "../types";
import type {
  CustomerInsightsSummary,
  FormResponseRow,
  UnmatchedBucket,
} from "../types";

const TOP_COUNTRIES = 10;

export interface AggregateFilters {
  from: string | null;
  to: string | null;
  shop: string;
}

function incrementMap(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toSortedBuckets(map: Map<string, number>): { label: string; count: number }[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function toUnmatchedBuckets(map: Map<string, number>): UnmatchedBucket[] {
  return Array.from(map.entries())
    .map(([raw, count]) => ({ raw, count }))
    .sort((a, b) => b.count - a.count || a.raw.localeCompare(b.raw));
}

function matchesFilters(row: FormResponseRow, filters: AggregateFilters): boolean {
  if (filters.shop !== "all" && row.shop.canonical !== filters.shop) {
    return false;
  }

  if (!row.timestampDate) return true;

  if (filters.from && row.timestampDate < filters.from) return false;
  if (filters.to && row.timestampDate > filters.to) return false;

  return true;
}

function weekStartKey(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const monday = startOfWeek(d, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

function sortOtherLast(buckets: { label: string; count: number }[]): { label: string; count: number }[] {
  const rest = buckets.filter((b) => b.label !== OTHER_REVIEW);
  const other = buckets.filter((b) => b.label === OTHER_REVIEW);
  return [...rest, ...other];
}

export function aggregateFormResponses(
  rows: FormResponseRow[],
  filters: AggregateFilters,
  meta: {
    configured: boolean;
    lastFetchedAt: string;
    error?: string;
  },
): CustomerInsightsSummary {
  const filtered = rows.filter((row) => matchesFilters(row, filters));

  const shopMap = new Map<string, number>();
  const channelMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const weekMap = new Map<string, number>();
  const unmatchedShops = new Map<string, number>();
  const unmatchedChannels = new Map<string, number>();
  const unmatchedCountries = new Map<string, number>();

  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const row of rows) {
    if (row.timestampDate) {
      if (!minDate || row.timestampDate < minDate) minDate = row.timestampDate;
      if (!maxDate || row.timestampDate > maxDate) maxDate = row.timestampDate;
    }
  }

  for (const row of filtered) {
    incrementMap(shopMap, row.shop.canonical);
    incrementMap(channelMap, row.channel.canonical);
    incrementMap(countryMap, row.country.canonical);

    if (!row.shop.matched && row.shop.raw) {
      incrementMap(unmatchedShops, row.shop.raw);
    }
    if (!row.channel.matched && row.channel.raw) {
      incrementMap(unmatchedChannels, row.channel.raw);
    }
    if (!row.country.matched && row.country.raw) {
      incrementMap(unmatchedCountries, row.country.raw);
    }

    if (row.timestampDate) {
      incrementMap(weekMap, weekStartKey(row.timestampDate));
    }
  }

  const countrySorted = toSortedBuckets(countryMap).filter((c) => c.label !== OTHER_REVIEW);
  const topCountries = countrySorted.slice(0, TOP_COUNTRIES);

  // Form choices only — unmapped random answers stay in the admin review panel
  const byChannel = buildChannelChartBuckets(channelMap, 1);

  const byWeek = Array.from(weekMap.entries())
    .map(([weekStart, count]) => ({ weekStart, count }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return {
    totalSubmissions: filtered.length,
    byShop: sortOtherLast(toSortedBuckets(shopMap)),
    byChannel,
    topCountries,
    byWeek,
    unmatched: {
      shops: toUnmatchedBuckets(unmatchedShops),
      channels: toUnmatchedBuckets(unmatchedChannels).filter((b) => b.count > 1),
      countries: toUnmatchedBuckets(unmatchedCountries),
    },
    meta: {
      configured: meta.configured,
      dateRange: { min: minDate, max: maxDate },
      shops: getCanonicalShops(),
      lastFetchedAt: meta.lastFetchedAt,
      filtered: {
        from: filters.from,
        to: filters.to,
        shop: filters.shop,
      },
      error: meta.error,
    },
  };
}
