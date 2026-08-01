import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import {
  MERCH_TIERS,
  SNACKS_THRESHOLD,
  SNACKS_BONUS,
  PANIER_THRESHOLD,
  PANIER_BONUS,
  OPEX_THRESHOLD_DEFAULT,
  OPEX_BONUS,
  REVIEWS_VOLUME_THRESHOLD,
  REVIEWS_VOLUME_BONUS,
  REVIEWS_RATING_BONUS,
  REVIEWS_MIN_COUNT,
  REVENUE_THRESHOLDS,
  normalizeLocationKey,
  computeRatingTarget,
} from "@/modules/challenges/constants";

export interface LocationOverview {
  locationId: string;
  locationTitle: string;

  // Raw accounting aggregates (null = no daily entries found)
  salesNetIncVat: number | null;
  salesGoodiesNet: number | null;
  salesTicketNet: number | null;
  opexSum: number | null;

  // Manual inputs (combined totals used for metrics)
  entryCount: number | null;
  snacksSold: number | null;
  // Per-period breakdown for the UI inputs
  entryCountP1: number | null;
  entryCountP2: number | null;
  entryCountP3: number | null;
  snacksSoldP1: number | null;
  snacksSoldP2: number | null;
  snacksSoldP3: number | null;

  // Computed metrics
  revenue: {
    amount: number | null;
    threshold: number | null; // null = no gating defined for this location
    unlocked: boolean | null; // null = no data yet
    ratio: number | null; // amount / threshold, for progress bar (can exceed 1)
  };
  merchandising: {
    ratio: number | null;
    tier: 0 | 1 | 2 | 3;
    bonus: number;
  };
  snacks: {
    ratio: number | null;
    passes: boolean | null;
    bonus: number;
  };
  panierMoyen: {
    value: number | null;
    passes: boolean | null;
    bonus: number;
  };
  opex: {
    ratio: number | null;
    passes: boolean | null;
    threshold: number;
    bonus: number;
  };
  reviews: {
    count: number;
    avgRating: number;
    currentRating: number;
    totalReviewCount: number;
    ratingTarget: number;
    volumeRatio: number | null;
    volumePass: boolean | null;
    ratingPass: boolean | null;
    volumeBonus: number;
    ratingBonus: number;
  };

  totalBonus: number;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month parameter required in YYYY-MM format" }, { status: 400 });
  }

  const [year, monthNum] = month.split("-").map(Number);
  const rangeStart = new Date(year, monthNum - 1, 1).toISOString();
  const rangeEnd = new Date(year, monthNum, 1).toISOString();

  const supabase = getSupabaseServerClient();

  const [accountingResult, entriesResult, ratingsResult, reviewsResult, locationsResult] = await Promise.all([
    supabase
      .from("daily_entries")
      .select(
        "location_id, sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, sales_card_surcharge, exp_drinks_cash, exp_animals_cash, exp_makro_bank"
      )
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", `${year}-${String(monthNum).padStart(2, "0")}-01`)
      .lt("entry_date", `${year}-${String(monthNum === 12 ? 1 : monthNum + 1).padStart(2, "0")}-01`),
    supabase
      .from("location_entries")
      .select("location_id, entry_count, snacks_sold, period")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("month", month),
    supabase
      .from("location_gbp_ratings")
      .select("location_id, location_title, average_rating, total_review_count")
      .eq("organization_id", DEFAULT_ORG_ID),
    supabase
      .from("reviews_cache")
      .select("location_id, location_title, star_rating")
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("create_time", rangeStart)
      .lt("create_time", rangeEnd),
    supabase
      .from("locations")
      .select("id, name, external_id")
      .eq("organization_id", DEFAULT_ORG_ID)
      .not("external_id", "is", null),
  ]);

  if (accountingResult.error) return Response.json({ error: accountingResult.error.message }, { status: 500 });
  if (ratingsResult.error) return Response.json({ error: ratingsResult.error.message }, { status: 500 });
  if (reviewsResult.error) return Response.json({ error: reviewsResult.error.message }, { status: 500 });

  // Build UUID → GBP path mapping from the locations table (external_id = GBP path)
  const uuidToGbp = new Map<string, string>();
  const gbpToInternalName = new Map<string, string>();
  for (const loc of locationsResult.data ?? []) {
    if (loc.external_id) {
      uuidToGbp.set(loc.id, loc.external_id);
      gbpToInternalName.set(loc.external_id, loc.name as string);
    }
  }

  // Aggregate accounting data by location — translate UUID → GBP path when mapping exists
  type AccAgg = {
    salesNetIncVat: number;
    salesGoodiesNet: number;
    salesTicketNet: number;
    opexSum: number;
    internalName: string | null; // from locations table
  };
  const accByLoc = new Map<string, AccAgg>();
  for (const row of accountingResult.data ?? []) {
    // Translate UUID to GBP path if a mapping exists; otherwise keep UUID as fallback key
    const canonicalId = uuidToGbp.get(row.location_id) ?? row.location_id;
    const existing = accByLoc.get(canonicalId) ?? {
      salesNetIncVat: 0,
      salesGoodiesNet: 0,
      salesTicketNet: 0,
      opexSum: 0,
      internalName: gbpToInternalName.get(canonicalId) ?? null,
    };
    // Sales fields are already VAT-inclusive as entered by staff (see accounting/types.ts salesNetTotal)
    const rowSalesNet =
      (row.sales_drinks_net ?? 0) +
      (row.sales_ticket_net ?? 0) +
      (row.sales_snack_net ?? 0) +
      (row.sales_goodies_net ?? 0) +
      (row.sales_card_surcharge ?? 0);
    existing.salesNetIncVat += rowSalesNet;
    existing.salesGoodiesNet += row.sales_goodies_net ?? 0;
    existing.salesTicketNet += row.sales_ticket_net ?? 0;
    existing.opexSum +=
      (row.exp_drinks_cash ?? 0) + (row.exp_animals_cash ?? 0) + (row.exp_makro_bank ?? 0);
    accByLoc.set(canonicalId, existing);
  }

  // Manual inputs — sum both periods; also track per-period for the UI
  type EntryInputs = {
    entryCount: number | null;
    snacksSold: number | null;
    entryCountP1: number | null;
    entryCountP2: number | null;
    entryCountP3: number | null;
    snacksSoldP1: number | null;
    snacksSoldP2: number | null;
    snacksSoldP3: number | null;
  };
  const entriesByLoc = new Map<string, EntryInputs>();
  for (const r of entriesResult.data ?? []) {
    const period = (r as { location_id: string; entry_count: number | null; snacks_sold: number | null; period: number }).period;
    const existing = entriesByLoc.get(r.location_id) ?? {
      entryCount: null, snacksSold: null,
      entryCountP1: null, entryCountP2: null, entryCountP3: null,
      snacksSoldP1: null, snacksSoldP2: null, snacksSoldP3: null,
    };
    const ec = r.entry_count as number | null;
    const ss = (r.snacks_sold ?? null) as number | null;
    if (period === 1) {
      existing.entryCountP1 = ec;
      existing.snacksSoldP1 = ss;
    } else if (period === 2) {
      existing.entryCountP2 = ec;
      existing.snacksSoldP2 = ss;
    } else {
      existing.entryCountP3 = ec;
      existing.snacksSoldP3 = ss;
    }
    const sumEc = (existing.entryCountP1 ?? 0) + (existing.entryCountP2 ?? 0) + (existing.entryCountP3 ?? 0);
    const sumSs = (existing.snacksSoldP1 ?? 0) + (existing.snacksSoldP2 ?? 0) + (existing.snacksSoldP3 ?? 0);
    existing.entryCount = existing.entryCountP1 !== null || existing.entryCountP2 !== null || existing.entryCountP3 !== null ? sumEc : null;
    existing.snacksSold = existing.snacksSoldP1 !== null || existing.snacksSoldP2 !== null || existing.snacksSoldP3 !== null ? sumSs : null;
    entriesByLoc.set(r.location_id, existing);
  }

  // GBP ratings
  const gbpByLoc = new Map(
    (ratingsResult.data ?? []).map((r) => [
      r.location_id,
      { title: r.location_title as string, avgRating: r.average_rating as number, totalCount: r.total_review_count as number },
    ])
  );

  // Monthly reviews aggregate
  type RevAgg = { title: string; count: number; ratingSum: number };
  const revByLoc = new Map<string, RevAgg>();
  for (const row of reviewsResult.data ?? []) {
    const existing = revByLoc.get(row.location_id) ?? { title: row.location_title as string, count: 0, ratingSum: 0 };
    existing.count++;
    existing.ratingSum += row.star_rating as number;
    revByLoc.set(row.location_id, existing);
  }

  // Union all location IDs
  const allIds = new Set([
    ...Array.from(accByLoc.keys()),
    ...Array.from(entriesByLoc.keys()),
    ...Array.from(gbpByLoc.keys()),
    ...Array.from(revByLoc.keys()),
  ]);

  const locations: LocationOverview[] = Array.from(allIds).map((locationId) => {
    const acc = accByLoc.get(locationId) ?? null;
    const inputs = entriesByLoc.get(locationId) ?? {
      entryCount: null, snacksSold: null,
      entryCountP1: null, entryCountP2: null, entryCountP3: null,
      snacksSoldP1: null, snacksSoldP2: null, snacksSoldP3: null,
    };
    const gbp = gbpByLoc.get(locationId);
    const rev = revByLoc.get(locationId);

    // Prefer internal location name (admin-set), then GBP title, then raw ID
    const title = acc?.internalName ?? gbp?.title ?? rev?.title ?? locationId;
    const entryCount = inputs.entryCount;
    const snacksSold = inputs.snacksSold;

    // ── Merchandising ──
    const salesNetIncVat = acc?.salesNetIncVat ?? null;
    const salesGoodiesNet = acc?.salesGoodiesNet ?? null;
    let merchRatio: number | null = null;
    if (salesNetIncVat !== null && salesNetIncVat > 0 && salesGoodiesNet !== null) {
      merchRatio = salesGoodiesNet / salesNetIncVat;
    }
    let merchTier: 0 | 1 | 2 | 3 = 0;
    if (merchRatio !== null) {
      if (merchRatio >= MERCH_TIERS[0].threshold) merchTier = 3;
      else if (merchRatio >= MERCH_TIERS[1].threshold) merchTier = 2;
      else if (merchRatio >= MERCH_TIERS[2].threshold) merchTier = 1;
    }

    // ── Revenue gate ── unlocks snacks/panier/opex/reviews (merchandising is exempt)
    const revenueThreshold = REVENUE_THRESHOLDS[normalizeLocationKey(title)] ?? null;
    const revenueUnlocked =
      revenueThreshold === null ? true : salesNetIncVat !== null && salesNetIncVat >= revenueThreshold;
    const revenueLocked = revenueThreshold !== null && !revenueUnlocked;
    const revenueRatio = revenueThreshold !== null ? (salesNetIncVat ?? 0) / revenueThreshold : null;

    // ── Snacks ──
    let snackRatio: number | null = null;
    if (snacksSold !== null && entryCount !== null && entryCount > 0) {
      snackRatio = snacksSold / entryCount;
    }
    const snackPasses = snackRatio !== null ? snackRatio >= SNACKS_THRESHOLD : null;
    const snackBonus = snackPasses === true && !revenueLocked ? SNACKS_BONUS : 0;

    // ── Panier moyen ──
    let panierValue: number | null = null;
    if (salesNetIncVat !== null && acc?.salesTicketNet !== null && entryCount !== null && entryCount > 0) {
      panierValue = (salesNetIncVat - (acc?.salesTicketNet ?? 0)) / entryCount;
    }
    const panierPasses = panierValue !== null ? panierValue >= PANIER_THRESHOLD : null;
    const panierBonus = panierPasses === true && !revenueLocked ? PANIER_BONUS : 0;

    // ── Opex ──
    const opexSum = acc?.opexSum ?? null;
    let opexRatio: number | null = null;
    if (opexSum !== null && salesNetIncVat !== null && salesNetIncVat > 0) {
      opexRatio = opexSum / salesNetIncVat;
    }
    const opexThreshold = OPEX_THRESHOLD_DEFAULT;
    const opexPasses = opexRatio !== null ? opexRatio < opexThreshold : null;
    const opexBonus = opexPasses === true && !revenueLocked ? OPEX_BONUS : 0;

    // ── Reviews ──
    const revCount = rev?.count ?? 0;
    const revAvg = revCount > 0 ? Math.round(((rev?.ratingSum ?? 0) / revCount) * 10) / 10 : 0;
    const currentRating = gbp?.avgRating ?? 0;
    const ratingTarget = computeRatingTarget(currentRating);
    const volumeRatio = entryCount !== null && entryCount > 0 ? revCount / entryCount : null;
    const volumePass = volumeRatio !== null ? volumeRatio >= REVIEWS_VOLUME_THRESHOLD : null;
    const ratingPass =
      revCount >= REVIEWS_MIN_COUNT && currentRating > 0 && ratingTarget > 0
        ? revAvg >= ratingTarget
        : null;
    const volumeBonus = volumePass === true && !revenueLocked ? REVIEWS_VOLUME_BONUS : 0;
    const ratingBonus = ratingPass === true && !revenueLocked ? REVIEWS_RATING_BONUS : 0;

    const totalBonus = [0, 1500, 3000, 5000][merchTier] + snackBonus + panierBonus + opexBonus + volumeBonus + ratingBonus;

    return {
      locationId,
      locationTitle: title,
      salesNetIncVat,
      salesGoodiesNet,
      salesTicketNet: acc?.salesTicketNet ?? null,
      opexSum,
      entryCount,
      snacksSold,
      entryCountP1: inputs.entryCountP1,
      entryCountP2: inputs.entryCountP2,
      entryCountP3: inputs.entryCountP3,
      snacksSoldP1: inputs.snacksSoldP1,
      snacksSoldP2: inputs.snacksSoldP2,
      snacksSoldP3: inputs.snacksSoldP3,
      revenue: {
        amount: salesNetIncVat,
        threshold: revenueThreshold,
        unlocked: revenueThreshold === null ? null : revenueUnlocked,
        ratio: revenueRatio,
      },
      merchandising: { ratio: merchRatio, tier: merchTier, bonus: [0, 1500, 3000, 5000][merchTier] as 0 },
      snacks: { ratio: snackRatio, passes: snackPasses, bonus: snackBonus },
      panierMoyen: { value: panierValue, passes: panierPasses, bonus: panierBonus },
      opex: { ratio: opexRatio, passes: opexPasses, threshold: opexThreshold, bonus: opexBonus },
      reviews: {
        count: revCount,
        avgRating: revAvg,
        currentRating,
        totalReviewCount: gbp?.totalCount ?? 0,
        ratingTarget,
        volumeRatio,
        volumePass,
        ratingPass,
        volumeBonus,
        ratingBonus,
      },
      totalBonus,
    };
  });

  locations.sort((a, b) => a.locationTitle.localeCompare(b.locationTitle));

  return Response.json({ locations });
}
