import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

const MERCH_TIERS = [
  { threshold: 0.09, bonus: 5000 },
  { threshold: 0.08, bonus: 3000 },
  { threshold: 0.07, bonus: 1500 },
] as const;

const SNACKS_THRESHOLD = 0.45;
const SNACKS_BONUS = 1250;
const PANIER_THRESHOLD = 170;
const PANIER_BONUS = 1250;
const OPEX_THRESHOLD_DEFAULT = 0.10;
const OPEX_THRESHOLD_PHANGAN = 0.15;
const OPEX_BONUS = 1250;
const REVIEWS_VOLUME_THRESHOLD = 0.04;
const REVIEWS_VOLUME_BONUS = 625;
const REVIEWS_RATING_BONUS = 625;
const REVIEWS_MIN_COUNT = 10;

function isPhangan(title: string): boolean {
  return /phangan/i.test(title);
}

function computeRatingTarget(currentRating: number): number {
  if (currentRating <= 0) return 0;
  return Math.min(4.5, Math.round((currentRating + 0.1) * 10) / 10);
}

export interface LocationOverview {
  locationId: string;
  locationTitle: string;

  // Raw accounting aggregates (null = no daily entries found)
  salesNetIncVat: number | null;
  salesGoodiesNet: number | null;
  salesTicketNet: number | null;
  opexSum: number | null;

  // Manual inputs
  entryCount: number | null;
  snacksSold: number | null;

  // Computed metrics
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

  const [accountingResult, entriesResult, ratingsResult, reviewsResult] = await Promise.all([
    supabase
      .from("daily_entries")
      .select(
        "location_id, sales_drinks_net, sales_ticket_net, sales_snack_net, sales_goodies_net, sales_card_surcharge, vat_7, exp_drinks_cash, exp_animals_cash, exp_makro_bank"
      )
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("entry_date", `${year}-${String(monthNum).padStart(2, "0")}-01`)
      .lt("entry_date", `${year}-${String(monthNum === 12 ? 1 : monthNum + 1).padStart(2, "0")}-01`),
    supabase
      .from("location_entries")
      .select("location_id, entry_count, snacks_sold")
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
  ]);

  if (accountingResult.error) return Response.json({ error: accountingResult.error.message }, { status: 500 });
  if (ratingsResult.error) return Response.json({ error: ratingsResult.error.message }, { status: 500 });
  if (reviewsResult.error) return Response.json({ error: reviewsResult.error.message }, { status: 500 });

  // Aggregate accounting data by location
  type AccAgg = {
    salesNetIncVat: number;
    salesGoodiesNet: number;
    salesTicketNet: number;
    opexSum: number;
  };
  const accByLoc = new Map<string, AccAgg>();
  for (const row of accountingResult.data ?? []) {
    const existing = accByLoc.get(row.location_id) ?? {
      salesNetIncVat: 0,
      salesGoodiesNet: 0,
      salesTicketNet: 0,
      opexSum: 0,
    };
    const rowSalesNet =
      (row.sales_drinks_net ?? 0) +
      (row.sales_ticket_net ?? 0) +
      (row.sales_snack_net ?? 0) +
      (row.sales_goodies_net ?? 0) +
      (row.sales_card_surcharge ?? 0) +
      (row.vat_7 ?? 0);
    existing.salesNetIncVat += rowSalesNet;
    existing.salesGoodiesNet += row.sales_goodies_net ?? 0;
    existing.salesTicketNet += row.sales_ticket_net ?? 0;
    existing.opexSum +=
      (row.exp_drinks_cash ?? 0) + (row.exp_animals_cash ?? 0) + (row.exp_makro_bank ?? 0);
    accByLoc.set(row.location_id, existing);
  }

  // Manual inputs
  const entriesByLoc = new Map(
    (entriesResult.data ?? []).map((r) => [
      r.location_id,
      { entryCount: r.entry_count as number | null, snacksSold: (r.snacks_sold ?? null) as number | null },
    ])
  );

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
    const inputs = entriesByLoc.get(locationId) ?? { entryCount: null, snacksSold: null };
    const gbp = gbpByLoc.get(locationId);
    const rev = revByLoc.get(locationId);

    const title = gbp?.title ?? rev?.title ?? locationId;
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
    // ── Snacks ──
    let snackRatio: number | null = null;
    if (snacksSold !== null && entryCount !== null && entryCount > 0) {
      snackRatio = snacksSold / entryCount;
    }
    const snackPasses = snackRatio !== null ? snackRatio >= SNACKS_THRESHOLD : null;
    const snackBonus = snackPasses === true ? SNACKS_BONUS : 0;

    // ── Panier moyen ──
    let panierValue: number | null = null;
    if (salesNetIncVat !== null && acc?.salesTicketNet !== null && entryCount !== null && entryCount > 0) {
      panierValue = (salesNetIncVat - (acc?.salesTicketNet ?? 0)) / entryCount;
    }
    const panierPasses = panierValue !== null ? panierValue >= PANIER_THRESHOLD : null;
    const panierBonus = panierPasses === true ? PANIER_BONUS : 0;

    // ── Opex ──
    const opexSum = acc?.opexSum ?? null;
    let opexRatio: number | null = null;
    if (opexSum !== null && salesNetIncVat !== null && salesNetIncVat > 0) {
      opexRatio = opexSum / salesNetIncVat;
    }
    const opexThreshold = isPhangan(title) ? OPEX_THRESHOLD_PHANGAN : OPEX_THRESHOLD_DEFAULT;
    const opexPasses = opexRatio !== null ? opexRatio < opexThreshold : null;
    const opexBonus = opexPasses === true ? OPEX_BONUS : 0;

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
    const volumeBonus = volumePass === true ? REVIEWS_VOLUME_BONUS : 0;
    const ratingBonus = ratingPass === true ? REVIEWS_RATING_BONUS : 0;

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
