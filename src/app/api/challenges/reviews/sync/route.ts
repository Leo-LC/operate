import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { LOCATION_NAMES, DEFAULT_ORG_ID, REVIEWS_BASE, EXCLUDED_LOCATION_IDS } from "@/lib/constants";
import { fetchAllLocations, getPreferredAccountId } from "@/lib/google-business";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Review } from "@/types/review";

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

async function fetchAllReviewsForLocation(
  accessToken: string,
  accountId: string,
  locationName: string
): Promise<Review[]> {
  const out: Review[] = [];
  let pageToken: string | undefined;
  const baseUrl = `${REVIEWS_BASE}/accounts/${accountId}/${locationName}/reviews`;

  do {
    const url = pageToken ? `${baseUrl}?pageToken=${pageToken}` : baseUrl;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Reviews API error for ${locationName}: ${res.status} ${err}`);
    }
    const data = (await res.json()) as { reviews?: Review[]; nextPageToken?: string };
    if (data.reviews) out.push(...data.reviews);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return out;
}

export async function POST(request: Request) {
  // Accept either a valid session (manual trigger) or CRON_SECRET bearer token
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) {
    return Response.json(
      { error: "Google token not configured — sign in with Google first" },
      { status: 503 }
    );
  }

  try {
    const accountId = await getPreferredAccountId(accessToken);
    const locations = await fetchAllLocations(accessToken, accountId);
    const supabase = getSupabaseServerClient();
    const syncedAt = new Date().toISOString();
    let totalSynced = 0;

    // Accumulate all-time rating stats per location from fetched reviews
    const locationStats = new Map<string, { title: string; ratingSum: number; count: number }>();

    const concurrency = 4;
    for (let i = 0; i < locations.length; i += concurrency) {
      const batch = locations.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (loc) => {
          const shortName = loc.name.replace(/^accounts\/[^/]+\//, "");
          if (EXCLUDED_LOCATION_IDS.has(shortName)) return;
          const locationTitle = LOCATION_NAMES[shortName] ?? loc.title ?? shortName;

          try {
            const reviews = await fetchAllReviewsForLocation(accessToken, accountId, shortName);

            if (reviews.length === 0) return;

            const rows = reviews
              .map((r) => {
                const starNum = STAR_RATING_MAP[r.starRating as string];
                if (!starNum) return null;
                const reviewId = r.reviewId ?? r.name?.split("/").pop() ?? "";
                if (!reviewId || !r.createTime || !r.updateTime) return null;
                return {
                  id: r.name ?? reviewId,
                  organization_id: DEFAULT_ORG_ID,
                  location_id: shortName,
                  location_title: locationTitle,
                  star_rating: starNum,
                  has_reply: !!r.reviewReply,
                  reviewer_display_name: r.reviewer?.displayName ?? null,
                  create_time: r.createTime,
                  update_time: r.updateTime,
                  synced_at: syncedAt,
                };
              })
              .filter(Boolean);

            if (rows.length === 0) return;

            const { error } = await supabase
              .from("reviews_cache")
              .upsert(rows, { onConflict: "id" });

            if (error) {
              console.error(`[challenges/sync] upsert error for ${shortName}:`, error.message);
            } else {
              totalSynced += rows.length;
              // Compute all-time stats from the full fetched set
              let ratingSum = 0;
              let count = 0;
              for (const r of rows) {
                ratingSum += r!.star_rating;
                count++;
              }
              locationStats.set(shortName, { title: locationTitle, ratingSum, count });
            }
          } catch (e) {
            console.error(
              `[challenges/sync] failed for ${shortName}:`,
              e instanceof Error ? e.message : e
            );
          }
        })
      );
    }

    // Upsert all-time ratings computed from synced reviews
    const ratingRows = Array.from(locationStats.entries()).map(([locationId, stats]) => ({
      location_id: locationId,
      organization_id: DEFAULT_ORG_ID,
      location_title: stats.title,
      average_rating: Math.round((stats.ratingSum / stats.count) * 10) / 10,
      total_review_count: stats.count,
      synced_at: syncedAt,
    }));

    if (ratingRows.length > 0) {
      await supabase
        .from("location_gbp_ratings")
        .upsert(ratingRows, { onConflict: "location_id,organization_id" });
    }

    return Response.json({ synced: totalSynced, locations: locations.length, syncedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
