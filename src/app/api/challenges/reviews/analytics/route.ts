import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import {
  buildGbpToUuidMap,
  reviewJoinKey,
  selectGbpRatings,
  selectReviewsCache,
} from "@/modules/challenges/lib/review-location";

interface LocationCard {
  locationId: string;
  locationTitle: string;
  count: number;
  avgRating: number;
  currentRating: number;
  totalReviewCount: number;
  ratingTarget: number;
  entryCount: number | null;
}

function computeRatingTarget(currentRating: number): number {
  if (currentRating <= 0) return 0;
  return Math.min(4.5, Math.round((currentRating + 0.1) * 10) / 10);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month parameter required in YYYY-MM format" }, { status: 400 });
  }

  const [year, monthNum] = month.split("-").map(Number);
  const rangeStart = new Date(year, monthNum - 1, 1).toISOString();
  const rangeEnd = new Date(year, monthNum, 1).toISOString();

  const supabase = getSupabaseServerClient();

  const [reviewsRows, ratingsRows, entriesResult, locationsResult] = await Promise.all([
    // Prefer location_uuid, TEXT fallback pre-migration — see review-location.ts.
    selectReviewsCache(supabase, rangeStart, rangeEnd),
    selectGbpRatings(supabase),
    supabase
      .from("challenge_counters")
      .select("location_id, entry_count")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("month", month),
    supabase
      .from("locations")
      .select("id, external_id")
      .eq("organization_id", DEFAULT_ORG_ID),
  ]);

  if (entriesResult.error) {
    return Response.json({ error: entriesResult.error.message }, { status: 500 });
  }
  if (locationsResult.error) {
    return Response.json({ error: locationsResult.error.message }, { status: 500 });
  }

  // Canonical join key: internal UUID when resolvable (fixes entryCount,
  // which is keyed by UUID in challenge_counters), else the GBP TEXT id.
  const gbpToUuid = buildGbpToUuidMap(
    (locationsResult.data ?? []) as Array<{ id: string; external_id: string | null }>,
  );
  const joinKey = (row: { location_id: string; location_uuid?: string | null }) =>
    reviewJoinKey(row, gbpToUuid);

  const gbpRatings = new Map(
    ratingsRows.map((r) => [
      joinKey(r),
      { currentRating: r.average_rating, totalReviewCount: r.total_review_count, locationTitle: r.location_title },
    ])
  );

  const entryByLocation = new Map(
    (entriesResult.data ?? []).map((r) => [r.location_id, r.entry_count])
  );

  // Aggregate monthly stats per location
  const byLocation = new Map<string, { title: string; count: number; ratingSum: number }>();

  for (const row of reviewsRows) {
    const key = joinKey(row);
    const existing = byLocation.get(key) ?? {
      title: row.location_title,
      count: 0,
      ratingSum: 0,
    };
    existing.count++;
    existing.ratingSum += row.star_rating;
    byLocation.set(key, existing);
  }

  const allLocationIds = new Set([
    ...Array.from(gbpRatings.keys()),
    ...Array.from(byLocation.keys()),
  ]);

  const locations: LocationCard[] = Array.from(allLocationIds)
    .map((locationId) => {
      const monthly = byLocation.get(locationId);
      const gbp = gbpRatings.get(locationId);
      const title = gbp?.locationTitle ?? monthly?.title ?? locationId;
      const count = monthly?.count ?? 0;
      const avgRating = count > 0 ? Math.round((monthly!.ratingSum / count) * 10) / 10 : 0;
      const currentRating = gbp?.currentRating ?? 0;
      return {
        locationId,
        locationTitle: title,
        count,
        avgRating,
        currentRating,
        totalReviewCount: gbp?.totalReviewCount ?? 0,
        ratingTarget: computeRatingTarget(currentRating),
        entryCount: entryByLocation.get(locationId) ?? null,
      };
    })
    .sort((a, b) => a.locationTitle.localeCompare(b.locationTitle));

  const lastSyncedAt =
    reviewsRows.length > 0
      ? reviewsRows.reduce((max, r) => (r.synced_at > max ? r.synced_at : max), reviewsRows[0].synced_at)
      : null;

  return Response.json({ locations, lastSyncedAt });
}
