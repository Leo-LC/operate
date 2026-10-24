// Pure helpers behind GET /api/reviews/stats and the Reviews Stats tab UI.
//
// Data flow: the API route calls the `reviews_cache_stats` Postgres function
// (supabase/migrations), which returns one `StatPart` per
// (shop, period, star rating, replied?, time bucket) group — raw review rows
// never leave Postgres (the table has ~10k rows and Supabase caps request
// payloads at 1000 rows). Everything below is side-effect-free so it runs on
// the server and is unit-tested.
//
// All bucket timestamps are UTC (dates in UTC or ISO strings with offset) so
// the JS bucket keys match the SQL `to_char`/`date_trunc` keys exactly.

export type Granularity = "day" | "week" | "month";

export const PERIOD_PRESETS = [
  { key: "7d", label: "7 days", days: 7, granularity: "day" as Granularity },
  { key: "30d", label: "30 days", days: 30, granularity: "week" as Granularity },
  { key: "90d", label: "90 days", days: 90, granularity: "week" as Granularity },
  { key: "12m", label: "12 months", days: 365, granularity: "month" as Granularity },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["key"];

export const DEFAULT_PRESET: PeriodPreset = "30d";

export function presetDef(preset: PeriodPreset) {
  return PERIOD_PRESETS.find((p) => p.key === preset) ?? PERIOD_PRESETS[1];
}

/** One pre-aggregated group of reviews from the SQL RPC. */
export interface StatPart {
  locationId: string;
  period: "current" | "prior";
  star: number; // 1..5
  replied: boolean;
  /** Bucket key for current-period parts ("YYYY-MM-DD" or "YYYY-MM"); "" for prior. */
  key: string;
  n: number;
}

export interface StatTitle {
  locationId: string;
  title: string;
}

/** One time bucket of the trend series. */
export interface StatsPoint {
  key: string;
  label: string;
  count: number;
  ratingSum: number;
}

export interface StatsSummary {
  count: number;
  avg: number | null;
  priorCount: number;
  priorAvg: number | null;
  /** Share of reviews that have a public reply, 0..1 (null when empty). */
  replyRate: number | null;
  /** Bucketed 1★..5★, index 0 = 1★. */
  distribution: [number, number, number, number, number];
  /** Same bucketing for the prior window (null when the prior window is empty). */
  priorDistribution: [number, number, number, number, number] | null;
}

export interface ShopStats extends StatsSummary {
  key: string; // GBP location id
  title: string;
  points: StatsPoint[];
}

export interface ReviewsStatsResult {
  preset: PeriodPreset;
  granularity: Granularity;
  /** ISO timestamps of the compared windows (current/prior). */
  currentFrom: string;
  currentTo: string;
  priorFrom: string;
  priorTo: string;
  overall: StatsSummary;
  overallPoints: StatsPoint[];
  shops: ShopStats[];
}

// ---------------------------------------------------------------------------
// Period math (UTC)
// ---------------------------------------------------------------------------

function utcStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUTC(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Monday of the week containing `d`, in UTC. */
export function startOfWeek(d: Date): Date {
  const x = utcStartOfDay(d);
  const diff = (x.getUTCDay() + 6) % 7; // days since Monday
  x.setUTCDate(x.getUTCDate() - diff);
  return x;
}

export interface PeriodBounds {
  currentFrom: Date;
  /** Start of day of `now`, inclusive end of the current window. */
  currentTo: Date;
  priorFrom: Date;
  priorTo: Date;
  /** Exclusive end of the current window (currentTo + 1 day). */
  endExclusive: Date;
}

/**
 * Current window = the last `days` calendar days including today.
 * Prior window = the same length immediately before it.
 */
export function periodBounds(preset: PeriodPreset, now: Date = new Date()): PeriodBounds {
  const days = presetDef(preset).days;
  const currentTo = utcStartOfDay(now);
  const currentFrom = addDaysUTC(currentTo, -(days - 1));
  const priorTo = addDaysUTC(currentFrom, -1);
  const priorFrom = addDaysUTC(priorTo, -(days - 1));
  return { currentFrom, currentTo, priorFrom, priorTo, endExclusive: addDaysUTC(currentTo, 1) };
}

// ---------------------------------------------------------------------------
// Bucketing (keys match the SQL function; labels for the chart x-axis)
// ---------------------------------------------------------------------------

/** Bucket key as written by the SQL function, for a UTC instant. */
export function bucketKey(d: Date, g: Granularity): string {
  if (g === "day") return ymdUTC(d);
  if (g === "week") return ymdUTC(startOfWeek(d));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ymdUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}-` +
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getUTCDate()).padStart(2, "0")}`
  );
}

/** Label for a SQL bucket key ("YYYY-MM-DD" → "24 Oct", "YYYY-MM" → "Oct '25"). */
function bucketLabel(key: string): string {
  if (key.length === 10) {
    const d = new Date(`${key}T00:00:00Z`);
    return `${d.getUTCDate()} ${d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}`;
  }
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return `${d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })} '${String(y).slice(2)}`;
}

/** Ordered buckets covering currentFrom..currentTo incl. the partial first week/month. */
function buildBuckets(g: Granularity, currentFrom: Date, currentTo: Date): Array<{ key: string; label: string }> {
  const res: Array<{ key: string; label: string }> = [];
  const push = (d: Date) => {
    const key = bucketKey(d, g);
    if (!res.some((b) => b.key === key)) res.push({ key, label: bucketLabel(key) });
  };
  if (g === "day") {
    for (let d = utcStartOfDay(currentFrom); d <= currentTo; d = addDaysUTC(d, 1)) push(d);
  } else if (g === "week") {
    for (let d = startOfWeek(currentFrom); d <= currentTo; d = addDaysUTC(d, 7)) push(d);
  } else {
    for (
      let d = new Date(Date.UTC(currentFrom.getUTCFullYear(), currentFrom.getUTCMonth(), 1));
      d <= currentTo;
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    ) {
      push(d);
    }
  }
  if (res.length === 0) res.push({ key: bucketKey(currentFrom, g), label: bucketLabel(bucketKey(currentFrom, g)) });
  return res;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

type Distribution = [number, number, number, number, number];

function emptyDistribution(): Distribution {
  return [0, 0, 0, 0, 0];
}

function validStar(star: number): boolean {
  return Number.isInteger(star) && star >= 1 && star <= 5;
}

/**
 * Aggregate RPC parts into overall + per-shop stats for `preset`.
 * `selectedKeys` (GBP location ids) restricts every number that is compared —
 * omit or pass null to include all shops. The per-shop breakdown always
 * covers every shop present in the data so side-by-side comparison still works.
 */
export function computeReviewsStats(
  parts: StatPart[],
  titles: StatTitle[],
  preset: PeriodPreset,
  selectedKeys: Set<string> | null,
  now: Date = new Date(),
): ReviewsStatsResult {
  const def = presetDef(preset);
  const g = def.granularity;
  const { currentFrom, priorFrom, endExclusive } = periodBounds(preset, now);

  const buckets = buildBuckets(g, currentFrom, addDaysUTC(endExclusive, -1));
  const pointsByShop = new Map<string, Map<string, { count: number; ratingSum: number }>>();
  const overall = {
    count: 0, ratingSum: 0, replied: 0,
    priorCount: 0, priorRatingSum: 0,
    distribution: emptyDistribution(),
    priorDistribution: emptyDistribution(),
  };
  const perShop = new Map<string, { count: number; ratingSum: number; replied: number; priorCount: number; priorRatingSum: number; distribution: Distribution; priorDistribution: Distribution }>();

  for (const part of parts) {
    if (!validStar(part.star) || !part.locationId) continue;
    const selected = !selectedKeys || selectedKeys.size === 0 || selectedKeys.has(part.locationId);
    const weight = part.n;

    if (part.period === "current" && selected) {
      overall.count += weight;
      overall.ratingSum += weight * part.star;
      if (part.replied) overall.replied += weight;
      overall.distribution[part.star - 1] += weight;
    }
    if (part.period === "prior" && selected) {
      overall.priorCount += weight;
      overall.priorRatingSum += weight * part.star;
      overall.priorDistribution[part.star - 1] += weight;
    }

    let acc = perShop.get(part.locationId);
    if (!acc) {
      acc = { count: 0, ratingSum: 0, replied: 0, priorCount: 0, priorRatingSum: 0, distribution: emptyDistribution(), priorDistribution: emptyDistribution() };
      perShop.set(part.locationId, acc);
    }
    if (part.period === "current") {
      acc.count += weight;
      acc.ratingSum += weight * part.star;
      if (part.replied) acc.replied += weight;
      acc.distribution[part.star - 1] += weight;

      if (part.key) {
        let map = pointsByShop.get(part.locationId);
        if (!map) {
          map = new Map();
          pointsByShop.set(part.locationId, map);
        }
        const prev = map.get(part.key) ?? { count: 0, ratingSum: 0 };
        map.set(part.key, { count: prev.count + weight, ratingSum: prev.ratingSum + weight * part.star });
      }
    } else {
      acc.priorCount += weight;
      acc.priorRatingSum += weight * part.star;
      acc.priorDistribution[part.star - 1] += weight;
    }
  }

  const titleByLocation = new Map<string, string>();
  for (const t of titles) {
    if (t.locationId && t.title) titleByLocation.set(t.locationId, t.title);
  }

  const emptyPoints: StatsPoint[] = buckets.map(({ key, label }) => ({ key, label, count: 0, ratingSum: 0 }));

  // Overall series, respecting the selection.
  const overallPoints: StatsPoint[] = buckets.map(({ key, label }) => ({ key, label, count: 0, ratingSum: 0 }));
  for (const part of parts) {
    if (!validStar(part.star) || part.period !== "current" || !part.key) continue;
    if (selectedKeys && selectedKeys.size > 0 && !selectedKeys.has(part.locationId)) continue;
    const bp = overallPoints.find((p) => p.key === part.key);
    if (!bp) continue;
    bp.count += part.n;
    bp.ratingSum += part.n * part.star;
  }

  const shops: ShopStats[] = Array.from(perShop.entries())
    .map(([key, acc]) => {
      const map = pointsByShop.get(key);
      return {
        key,
        title: titleByLocation.get(key) ?? key,
        count: acc.count,
        avg: acc.count > 0 ? acc.ratingSum / acc.count : null,
        priorCount: acc.priorCount,
        priorAvg: acc.priorCount > 0 ? acc.priorRatingSum / acc.priorCount : null,
        replyRate: acc.count > 0 ? acc.replied / acc.count : null,
        distribution: acc.distribution,
        priorDistribution: acc.priorCount > 0 ? acc.priorDistribution : null,
        points: map
          ? buckets.map(({ key: bk, label }) => {
              const p = map.get(bk) ?? { count: 0, ratingSum: 0 };
              return { key: bk, label, count: p.count, ratingSum: p.ratingSum };
            })
          : emptyPoints,
      };
    })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

  return {
    preset,
    granularity: g,
    currentFrom: currentFrom.toISOString(),
    currentTo: new Date(endExclusive.getTime() - 1).toISOString(),
    priorFrom: priorFrom.toISOString(),
    priorTo: new Date(currentFrom.getTime() - 1).toISOString(),
    overall: {
      count: overall.count,
      avg: overall.count > 0 ? overall.ratingSum / overall.count : null,
      priorCount: overall.priorCount,
      priorAvg: overall.priorCount > 0 ? overall.priorRatingSum / overall.priorCount : null,
      replyRate: overall.count > 0 ? overall.replied / overall.count : null,
      distribution: overall.distribution,
      priorDistribution: overall.priorCount > 0 ? overall.priorDistribution : null,
    },
    overallPoints,
    shops,
  };
}
