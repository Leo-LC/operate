import type { LocationOverview } from "@/modules/challenges/overview-data";
import {
  MERCH_TIERS,
  SNACKS_THRESHOLD,
  PANIER_THRESHOLD,
  OPEX_THRESHOLD_DEFAULT,
  REVIEWS_VOLUME_THRESHOLD,
  REVIEWS_MIN_COUNT,
} from "@/modules/challenges/constants";
import { buildTeamMetrics, shortLocationName } from "@/modules/challenges/team-metrics";

const EXECUTION_METRIC_COUNT = 6;
const MIN_SCORABLE_FOR_SPOTLIGHT = 3;
const MIN_SCORABLE_FOR_IMPROVED = 2;

export type RecognitionKind =
  | "revenue"
  | "merch"
  | "snacks"
  | "reviews"
  | "spend"
  | "completion"
  | "improved";

export interface MetricRecognition {
  kind: RecognitionKind;
  locationId: string;
  locationTitle: string;
  value: string;
  sub?: string;
  alsoStrong?: string[];
  unavailable?: boolean;
  unavailableReason?: string;
}

export interface SpotlightMetricRow {
  id: string;
  label: string;
  value: string;
  target: string;
  passes: boolean | null;
}

export interface FeaturedShopSpotlight {
  available: boolean;
  locationId?: string;
  locationTitle?: string;
  executionScore?: number;
  executionTotal?: number;
  summaryStats?: { label: string; value: string }[];
  metricBreakdown?: SpotlightMetricRow[];
  tips?: string[];
  /** @deprecated Use metricBreakdown in UI */
  achievements?: string[];
  /** @deprecated Use summaryStats in UI */
  standoutMetrics?: { label: string; value: string }[];
  /** @deprecated Use tips in UI */
  practices?: string[];
  /** @deprecated Use tips in UI */
  learnings?: string[];
}

export interface SpotlightResponse {
  month: string;
  monthInProgress: boolean;
  featured: FeaturedShopSpotlight;
  recognitions: MetricRecognition[];
  priorMonthAvailable: boolean;
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function metricPasses(loc: LocationOverview, key: string): boolean | null {
  switch (key) {
    case "merch":
      return loc.merchandising.tier >= 1 ? true : loc.merchandising.ratio !== null ? false : null;
    case "snacks":
      return loc.snacks.passes;
    case "spend":
      return loc.panierMoyen.passes;
    case "opex":
      return loc.opex.passes;
    case "reviewVolume":
      return loc.reviews.volumePass;
    case "reviewRating":
      return loc.reviews.ratingPass;
    default:
      return null;
  }
}

export function countScorableMetrics(loc: LocationOverview): number {
  const keys = ["merch", "snacks", "spend", "opex", "reviewVolume", "reviewRating"];
  return keys.filter((k) => metricPasses(loc, k) !== null).length;
}

export function computeExecutionScore(loc: LocationOverview): number {
  let score = 0;
  if (loc.merchandising.tier >= 1) score++;
  if (loc.snacks.passes === true) score++;
  if (loc.panierMoyen.passes === true) score++;
  if (loc.opex.passes === true) score++;
  if (loc.reviews.volumePass === true) score++;
  if (loc.reviews.ratingPass === true) score++;
  return score;
}

function computeMarginSum(loc: LocationOverview): number {
  let sum = 0;

  if (loc.merchandising.ratio !== null) {
    sum += Math.max(0, loc.merchandising.ratio - MERCH_TIERS[2].threshold);
  }
  if (loc.snacks.ratio !== null) {
    sum += Math.max(0, loc.snacks.ratio - SNACKS_THRESHOLD);
  }
  if (loc.panierMoyen.value !== null) {
    sum += Math.max(0, (loc.panierMoyen.value - PANIER_THRESHOLD) / PANIER_THRESHOLD);
  }
  if (loc.opex.ratio !== null) {
    sum += Math.max(0, OPEX_THRESHOLD_DEFAULT - loc.opex.ratio);
  }
  if (loc.reviews.volumeRatio !== null) {
    sum += Math.max(0, loc.reviews.volumeRatio - REVIEWS_VOLUME_THRESHOLD);
  }
  if (loc.reviews.count >= REVIEWS_MIN_COUNT && loc.reviews.ratingTarget > 0) {
    sum += Math.max(0, loc.reviews.avgRating - loc.reviews.ratingTarget);
  }

  return sum;
}

function compareLocations(a: LocationOverview, b: LocationOverview): number {
  const scoreDiff = computeExecutionScore(b) - computeExecutionScore(a);
  if (scoreDiff !== 0) return scoreDiff;
  const marginDiff = computeMarginSum(b) - computeMarginSum(a);
  if (marginDiff !== 0) return marginDiff;
  return shortLocationName(a.locationTitle).localeCompare(shortLocationName(b.locationTitle));
}

function stableNameSort(a: LocationOverview, b: LocationOverview): number {
  return shortLocationName(a.locationTitle).localeCompare(shortLocationName(b.locationTitle));
}

function reviewPerformanceScore(loc: LocationOverview): number | null {
  const { volumePass, ratingPass, volumeRatio, avgRating } = loc.reviews;
  if (volumePass === null && ratingPass === null) return null;
  let score = 0;
  if (volumePass === true) score += 1;
  if (ratingPass === true) score += 1;
  return score + (volumeRatio ?? 0) + avgRating / 10;
}

function pickLeader<T extends LocationOverview>(
  locations: T[],
  scoreFn: (loc: T) => number | null,
  valueFn: (loc: T) => string,
  subFn?: (loc: T) => string | undefined,
): Omit<MetricRecognition, "kind"> | null {
  const eligible = locations
    .map((loc) => ({ loc, score: scoreFn(loc) }))
    .filter((x): x is { loc: T; score: number } => x.score !== null);

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const diff = b.score - a.score;
    if (diff !== 0) return diff;
    return stableNameSort(a.loc, b.loc);
  });

  const best = eligible[0];
  const tied = eligible.filter((x) => Math.abs(x.score - best.score) < 0.001 && x.loc.locationId !== best.loc.locationId);

  return {
    locationId: best.loc.locationId,
    locationTitle: shortLocationName(best.loc.locationTitle),
    value: valueFn(best.loc),
    sub: subFn?.(best.loc),
    alsoStrong:
      tied.length > 0
        ? tied.slice(0, 2).map((t) => shortLocationName(t.loc.locationTitle))
        : undefined,
  };
}

export function pickFeaturedShop(locations: LocationOverview[]): FeaturedShopSpotlight {
  const eligible = locations.filter((loc) => countScorableMetrics(loc) >= MIN_SCORABLE_FOR_SPOTLIGHT);
  if (eligible.length === 0) {
    return { available: false };
  }

  const sorted = [...eligible].sort(compareLocations);
  const featured = sorted[0];
  const narrative = buildSpotlightNarrative(featured);

  return {
    available: true,
    locationId: featured.locationId,
    locationTitle: shortLocationName(featured.locationTitle),
    executionScore: computeExecutionScore(featured),
    executionTotal: EXECUTION_METRIC_COUNT,
    ...narrative,
  };
}

export function buildSpotlightNarrative(loc: LocationOverview): Pick<
  FeaturedShopSpotlight,
  "summaryStats" | "metricBreakdown" | "tips" | "achievements" | "standoutMetrics" | "practices" | "learnings"
> {
  const teamMetrics = buildTeamMetrics(loc);
  const passed = teamMetrics.filter((m) => m.currentPasses === true);

  const metricBreakdown: SpotlightMetricRow[] = teamMetrics.map((m) => ({
    id: m.id,
    label: m.label,
    value: m.current,
    target: m.target,
    passes: m.currentPasses,
  }));

  const achievements = passed.map((m) => `${m.label}: ${m.current} (target ${m.target})`);

  type MarginEntry = { id: string; label: string; value: string; margin: number };
  const margins: MarginEntry[] = [];

  if (loc.snacks.ratio !== null) {
    margins.push({
      id: "snacks",
      label: "Snack sales",
      value: `${Math.round(loc.snacks.ratio * 100)}/100 visits`,
      margin: loc.snacks.ratio - SNACKS_THRESHOLD,
    });
  }
  if (loc.panierMoyen.value !== null) {
    margins.push({
      id: "spend",
      label: "Average spend",
      value: `฿${fmt(loc.panierMoyen.value, 0)} / visitor`,
      margin: (loc.panierMoyen.value - PANIER_THRESHOLD) / PANIER_THRESHOLD,
    });
  }
  if (loc.merchandising.ratio !== null) {
    margins.push({
      id: "merch",
      label: "Merchandise",
      value: `${(loc.merchandising.ratio * 100).toFixed(1)}% of sales`,
      margin: loc.merchandising.ratio - MERCH_TIERS[2].threshold,
    });
  }
  if (loc.reviews.volumeRatio !== null) {
    margins.push({
      id: "reviews",
      label: "Google reviews",
      value: `${(loc.reviews.volumeRatio * 100).toFixed(1)}/100 visitors`,
      margin: loc.reviews.volumeRatio - REVIEWS_VOLUME_THRESHOLD,
    });
  }
  if (loc.reviews.count >= REVIEWS_MIN_COUNT) {
    margins.push({
      id: "rating",
      label: "Review rating",
      value: `${loc.reviews.avgRating.toFixed(1)}★`,
      margin: loc.reviews.avgRating - loc.reviews.ratingTarget,
    });
  }
  if (loc.opex.ratio !== null) {
    margins.push({
      id: "opex",
      label: "Running costs",
      value: `${(loc.opex.ratio * 100).toFixed(1)}% of sales`,
      margin: OPEX_THRESHOLD_DEFAULT - loc.opex.ratio,
    });
  }

  margins.sort((a, b) => b.margin - a.margin);
  const standoutMetrics = margins.slice(0, 3).map(({ label, value }) => ({ label, value }));

  const summaryStats = standoutMetrics.slice(0, 3);

  const practices = passed.slice(0, 4).map((m) => m.adviceTip);
  const learnings = passed.slice(0, 3).map((m) => m.adviceTip);
  const tips = Array.from(new Set(passed.slice(0, 3).map((m) => m.adviceTip)));

  return {
    summaryStats,
    metricBreakdown,
    tips,
    achievements,
    standoutMetrics,
    practices: Array.from(new Set(practices)),
    learnings: Array.from(new Set(learnings)),
  };
}

export function pickMetricLeaders(
  current: LocationOverview[],
  prior: LocationOverview[] | null,
): MetricRecognition[] {
  const priorById = new Map((prior ?? []).map((loc) => [loc.locationId, loc]));

  const revenueLeader = pickLeader(
    current.filter((loc) => loc.revenue.amount !== null && loc.revenue.threshold !== null),
    (loc) => loc.revenue.ratio ?? loc.revenue.amount! / loc.revenue.threshold!,
    (loc) => {
      const { amount, threshold } = loc.revenue;
      return `฿${fmt(amount!, 0)} / ฿${fmt(threshold!, 0)}`;
    },
    (loc) => {
      if (loc.revenue.unlocked === true) return "Sales target reached";
      if (loc.revenue.ratio !== null) return `${Math.round(loc.revenue.ratio * 100)}% of target`;
      return undefined;
    },
  );

  const merchLeader = pickLeader(
    current.filter(
      (loc) =>
        loc.merchandising.ratio !== null &&
        loc.salesNetIncVat !== null &&
        loc.salesNetIncVat > 0,
    ),
    (loc) => loc.merchandising.ratio!,
    (loc) => `${(loc.merchandising.ratio! * 100).toFixed(1)}% of sales`,
    (loc) => {
      const { tier } = loc.merchandising;
      const goodies = loc.salesGoodiesNet;
      if (tier >= 1) {
        return goodies !== null
          ? `Tier ${tier} · ฿${fmt(goodies, 0)} merch`
          : `Tier ${tier}`;
      }
      return goodies !== null ? `฿${fmt(goodies, 0)} merch sales` : undefined;
    },
  );

  const snacksLeader = pickLeader(
    current.filter((loc) => loc.entryCount !== null && loc.entryCount > 0 && loc.snacks.ratio !== null),
    (loc) => loc.snacks.ratio!,
    (loc) => `${Math.round(loc.snacks.ratio! * 100)}/100 visits`,
    (loc) => `${fmt(loc.snacksSold ?? 0, 0)} snacks · ${fmt(loc.entryCount ?? 0, 0)} visitors`,
  );

  const reviewsLeader = pickLeader(
    current.filter((loc) => loc.reviews.count > 0 || loc.reviews.volumeRatio !== null),
    (loc) => reviewPerformanceScore(loc)!,
    (loc) => {
      const vol = loc.reviews.volumeRatio !== null ? `${(loc.reviews.volumeRatio * 100).toFixed(1)}/100` : `${loc.reviews.count} reviews`;
      const rating = loc.reviews.count > 0 ? `${loc.reviews.avgRating.toFixed(1)}★` : "";
      return rating ? `${vol} · ${rating}` : vol;
    },
  );

  const spendLeader = pickLeader(
    current.filter((loc) => loc.panierMoyen.value !== null),
    (loc) => loc.panierMoyen.value!,
    (loc) => `฿${fmt(loc.panierMoyen.value!, 0)} / visitor`,
  );

  const completionLeader = pickLeader(
    current.filter((loc) => countScorableMetrics(loc) >= MIN_SCORABLE_FOR_IMPROVED),
    (loc) => computeExecutionScore(loc),
    (loc) => `${computeExecutionScore(loc)}/${EXECUTION_METRIC_COUNT} targets met`,
  );

  let improvedLeader: Omit<MetricRecognition, "kind"> | null = null;
  let priorMonthAvailable = false;

  if (prior && prior.length > 0) {
    const improvements = current
      .map((loc) => {
        const prev = priorById.get(loc.locationId);
        if (!prev) return null;
        if (countScorableMetrics(prev) < MIN_SCORABLE_FOR_IMPROVED) return null;
        if (countScorableMetrics(loc) < MIN_SCORABLE_FOR_IMPROVED) return null;
        const delta = computeExecutionScore(loc) - computeExecutionScore(prev);
        return { loc, delta, prevScore: computeExecutionScore(prev), currScore: computeExecutionScore(loc) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.delta > 0);

    if (improvements.length > 0) {
      priorMonthAvailable = true;
      improvements.sort((a, b) => {
        const diff = b.delta - a.delta;
        if (diff !== 0) return diff;
        return stableNameSort(a.loc, b.loc);
      });
      const best = improvements[0];
      improvedLeader = {
        locationId: best.loc.locationId,
        locationTitle: shortLocationName(best.loc.locationTitle),
        value: `+${best.delta} target${best.delta === 1 ? "" : "s"} vs last month`,
        sub: `${best.prevScore} → ${best.currScore} of ${EXECUTION_METRIC_COUNT} targets met`,
      };
    } else {
      const hasPriorData = current.some((loc) => {
        const prev = priorById.get(loc.locationId);
        return prev && countScorableMetrics(prev) >= MIN_SCORABLE_FOR_IMPROVED;
      });
      priorMonthAvailable = hasPriorData;
    }
  }

  const recognitions: MetricRecognition[] = [
    {
      kind: "revenue",
      ...(revenueLeader ?? {
        locationId: "",
        locationTitle: "",
        value: "—",
        unavailable: true,
        unavailableReason: "dataPending",
      }),
    },
    {
      kind: "merch",
      ...(merchLeader ?? {
        locationId: "",
        locationTitle: "",
        value: "—",
        unavailable: true,
        unavailableReason: "dataPending",
      }),
    },
    {
      kind: "snacks",
      ...(snacksLeader ?? {
        locationId: "",
        locationTitle: "",
        value: "—",
        unavailable: true,
        unavailableReason: "dataPending",
      }),
    },
    {
      kind: "reviews",
      ...(reviewsLeader ?? {
        locationId: "",
        locationTitle: "",
        value: "—",
        unavailable: true,
        unavailableReason: "dataPending",
      }),
    },
    {
      kind: "spend",
      ...(spendLeader ?? {
        locationId: "",
        locationTitle: "",
        value: "—",
        unavailable: true,
        unavailableReason: "dataPending",
      }),
    },
    {
      kind: "completion",
      ...(completionLeader ?? {
        locationId: "",
        locationTitle: "",
        value: "—",
        unavailable: true,
        unavailableReason: "dataPending",
      }),
    },
    {
      kind: "improved",
      ...(improvedLeader ?? {
        locationId: "",
        locationTitle: "",
        value: "—",
        unavailable: true,
        unavailableReason: priorMonthAvailable ? "dataPending" : "noPriorMonth",
      }),
    },
  ];

  return recognitions;
}

export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isMonthInProgress(month: string): boolean {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return month >= currentMonth;
}

export function buildSpotlightResponse(
  month: string,
  current: LocationOverview[],
  prior: LocationOverview[] | null,
): SpotlightResponse {
  const featured = pickFeaturedShop(current);
  const recognitions = pickMetricLeaders(current, prior);
  const priorMonthAvailable =
    prior !== null &&
    prior.some((loc) => countScorableMetrics(loc) >= MIN_SCORABLE_FOR_IMPROVED);

  return {
    month,
    monthInProgress: isMonthInProgress(month),
    featured,
    recognitions,
    priorMonthAvailable,
  };
}
