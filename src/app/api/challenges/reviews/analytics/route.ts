import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

interface LocationCard {
  locationId: string;
  locationTitle: string;
  count: number;
  avgRating: number;
  currentRating: number;
  totalReviewCount: number;
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

  const [reviewsResult, ratingsResult] = await Promise.all([
    supabase
      .from("reviews_cache")
      .select("location_id, location_title, star_rating, synced_at")
      .eq("organization_id", DEFAULT_ORG_ID)
      .gte("create_time", rangeStart)
      .lt("create_time", rangeEnd),
    supabase
      .from("location_gbp_ratings")
      .select("location_id, location_title, average_rating, total_review_count")
      .eq("organization_id", DEFAULT_ORG_ID),
  ]);

  if (reviewsResult.error) {
    return Response.json({ error: reviewsResult.error.message }, { status: 500 });
  }
  if (ratingsResult.error) {
    return Response.json({ error: ratingsResult.error.message }, { status: 500 });
  }

  const gbpRatings = new Map(
    (ratingsResult.data ?? []).map((r) => [
      r.location_id,
      { currentRating: r.average_rating, totalReviewCount: r.total_review_count, locationTitle: r.location_title },
    ])
  );

  // Aggregate monthly stats per location
  const byLocation = new Map<string, { title: string; count: number; ratingSum: number; lastSynced: string }>();

  for (const row of reviewsResult.data ?? []) {
    const existing = byLocation.get(row.location_id) ?? {
      title: row.location_title,
      count: 0,
      ratingSum: 0,
      lastSynced: row.synced_at,
    };
    existing.count++;
    existing.ratingSum += row.star_rating;
    if (row.synced_at > existing.lastSynced) existing.lastSynced = row.synced_at;
    byLocation.set(row.location_id, existing);
  }

  // Build cards: include all locations from gbp_ratings (even with 0 reviews this month)
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
      return {
        locationId,
        locationTitle: title,
        count,
        avgRating,
        currentRating: gbp?.currentRating ?? 0,
        totalReviewCount: gbp?.totalReviewCount ?? 0,
      };
    })
    .sort((a, b) => a.locationTitle.localeCompare(b.locationTitle));

  const lastSyncedAt =
    reviewsResult.data && reviewsResult.data.length > 0
      ? reviewsResult.data.reduce((max, r) => (r.synced_at > max ? r.synced_at : max), reviewsResult.data[0].synced_at)
      : null;

  return Response.json({ locations, lastSyncedAt });
}
