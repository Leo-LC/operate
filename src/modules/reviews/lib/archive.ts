import { DEFAULT_ORG_ID } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ReviewWithLocation } from "@/types/review";

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

/**
 * Best-effort archive of fetched reviews into `reviews_cache` — the same
 * store the nightly full sync writes. Called after the inbox fetch
 * (`fetchUnrepliedAcrossLocations`), so unreplied reviews get their text,
 * media count and origin (location) persisted immediately instead of waiting
 * for the nightly cron. Idempotent upsert on the review resource name;
 * failures are logged and never break the sync.
 *
 * Rows mirror sync-reviews.ts (same filters: 1–5★ with create/update time).
 */
export async function archiveUnrepliedReviews(reviews: ReviewWithLocation[]): Promise<number> {
  if (reviews.length === 0) return 0;

  const supabase = getSupabaseServerClient();

  // Column guards (dual-write style): comment + media_count come from
  // migration 20261125000000, location_uuid from 20260923000000.
  const [archiveColsOk, uuidOk] = await Promise.all([
    supabase
      .from("reviews_cache")
      .select("comment, media_count")
      .limit(0)
      .then(({ error }) => !error),
    supabase
      .from("reviews_cache")
      .select("location_uuid")
      .limit(0)
      .then(({ error }) => !error),
  ]);
  const { data: locRows } = await supabase
    .from("locations")
    .select("id, external_id")
    .eq("organization_id", DEFAULT_ORG_ID);
  const uuidByExternalId = new Map<string, string>();
  for (const row of (locRows ?? []) as Array<{ id: string; external_id: string | null }>) {
    if (row.external_id) uuidByExternalId.set(row.external_id, row.id);
  }

  const syncedAt = new Date().toISOString();
  const rows = reviews
    .map((r) => {
      const starNum = STAR_RATING_MAP[r.starRating as string];
      if (!starNum) return null;
      const reviewId = r.reviewId || r.name?.split("/").pop() || "";
      if (!reviewId || !r.createTime || !r.updateTime) return null;
      const locationUuid = uuidByExternalId.get(r.locationName) ?? null;
      return {
        id: r.name ?? reviewId,
        organization_id: DEFAULT_ORG_ID,
        location_id: r.locationName,
        ...(uuidOk && locationUuid ? { location_uuid: locationUuid } : {}),
        location_title: r.locationTitle,
        star_rating: starNum,
        has_reply: !!r.reviewReply,
        reviewer_display_name: r.reviewer?.displayName ?? null,
        ...(archiveColsOk ? { comment: r.comment ?? null, media_count: r.reviewMediaItems?.length ?? 0 } : {}),
        create_time: r.createTime,
        update_time: r.updateTime,
        synced_at: syncedAt,
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("reviews_cache")
    .upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("[reviews/archive] upsert failed:", error.message);
    return 0;
  }
  return rows.length;
}
