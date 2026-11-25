import { getOrganizationAccessToken } from "@/lib/google-token";
import { LOCATION_NAMES, DEFAULT_ORG_ID, REVIEWS_BASE, EXCLUDED_LOCATION_IDS } from "@/lib/constants";
import { fetchAllLocationsAcrossAccounts, gbpShortName, getActiveLocationExternalIds, getActiveLocations } from "@/lib/google-business";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Review } from "@/types/review";

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

/** Incremental margin: a page stops the fetch once every review on it is
 *  older than watermark − margin. Replies/edits keep the review's original
 *  createTime and the list order is not contractually sorted, so keep a
 *  generous buffer. */
const INCREMENTAL_MARGIN_MS = 30 * 24 * 60 * 60 * 1000;

/** Full-pass safety net: incremental page-skipping could miss edge cases
 *  (re-ordered rows, restored reviews, column backfills). Everything is
 *  rewritten on day 1–2 of the month (UTC). */
function isMonthlyFullPass(now = new Date()): boolean {
  return now.getUTCDate() <= 2;
}

/**
 * Pages through a location's reviews. With `sinceMs`, stops early: once a
 * whole page is older than the cutoff (reviews come newest-first in
 * practice), the remaining pages cannot contain newer reviews. Locations
 * with no cached history pass no cutoff and fetch everything.
 */
async function fetchReviewsForLocation(
  accessToken: string,
  accountId: string,
  locationName: string,
  sinceMs?: number,
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
    const page = data.reviews ?? [];
    out.push(...page);
    if (
      sinceMs !== undefined &&
      page.length > 0 &&
      page.every((r) => {
        const t = r.createTime ? Date.parse(r.createTime) : NaN;
        return Number.isNaN(t) || t < sinceMs;
      })
    ) {
      break;
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return out;
}

/** Column presence check — dual-write style guards (see hasLocationUuidColumn
 *  pattern): reads fail cleanly on pre-migration databases. */
async function hasColumns(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  table: "reviews_cache" | "location_gbp_ratings",
  columns: string,
): Promise<boolean> {
  const { error } = await supabase.from(table).select(columns).limit(0);
  return !error;
}

export type ReviewsSyncResult = {
  synced: number;
  locations: number;
  syncedAt: string;
  mode: "full" | "incremental";
};

export interface ReviewsSyncOptions {
  /** Fetch + rewrite every review, skipping the update_time differential.
   *  Used to backfill comment/media_count on existing rows (pass ?full=1 on
   *  the manual sync route); the monthly full pass does it automatically. */
  full?: boolean;
}

/**
 * Sync Google Business reviews → reviews_cache + location_gbp_ratings.
 * Shared by the manual route (POST /api/challenges/reviews/sync) and the
 * nightly sequential orchestrator (syncAllChallenges). Throws on fatal error
 * (no Google token); per-location failures are logged and skipped.
 *
 * Fetch strategy (see ReviewsSyncOptions): incremental by default — pages
 * stop at the location's newest cached review minus a margin; full when
 * requested or on the monthly pass. Either way the cache accumulates every
 * review (replied or not) with its text (comment) and attached media count.
 */
export async function syncReviews(opts: ReviewsSyncOptions = {}): Promise<ReviewsSyncResult> {
  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) {
    throw new Error("Google token not configured — sign in with Google first");
  }

  const full = opts.full === true || isMonthlyFullPass();

  const [gbpEntries, activeExternalIds, dbNames] = await Promise.all([
    fetchAllLocationsAcrossAccounts(accessToken),
    getActiveLocationExternalIds(),
    getActiveLocations(),
  ]);
  const supabase = getSupabaseServerClient();
  // Internal UUID per GBP short id, for the location_uuid join key
  // (migration 20260923000000). Falls back to TEXT-only rows pre-migration.
  const { data: locRows } = await supabase
    .from("locations")
    .select("id, external_id")
    .eq("organization_id", DEFAULT_ORG_ID);
  const uuidByExternalId = new Map<string, string>();
  for (const row of (locRows ?? []) as Array<{ id: string; external_id: string | null }>) {
    if (row.external_id) uuidByExternalId.set(row.external_id, row.id);
  }
  const [uuidCacheOk, uuidRatingsOk, archiveColsOk] = await Promise.all([
    hasColumns(supabase, "reviews_cache", "location_uuid"),
    hasColumns(supabase, "location_gbp_ratings", "location_uuid"),
    // comment + media_count (migration 20261125000000): review text and the
    // number of photos/videos the reviewer attached.
    hasColumns(supabase, "reviews_cache", "comment, media_count"),
  ]);
  const syncedAt = new Date().toISOString();
  let totalSynced = 0;

  // Incremental watermark: newest cached create_time per location. Locations
  // with no cached rows fetch their entire history (brand-new shop archive).
  const watermarks = new Map<string, number>();
  if (!full) {
    const { data: wmRows } = await supabase
      .from("reviews_cache")
      .select("location_id, create_time")
      .eq("organization_id", DEFAULT_ORG_ID);
    for (const row of (wmRows ?? []) as Array<{ location_id: string; create_time: string }>) {
      const t = Date.parse(row.create_time);
      if (Number.isNaN(t)) continue;
      const prev = watermarks.get(row.location_id);
      if (prev === undefined || t > prev) watermarks.set(row.location_id, t);
    }
  }

  // Locations processed this run → title (drives the ratings rewrite below)
  const processed = new Map<string, string>();

  const concurrency = 4;
  for (let i = 0; i < gbpEntries.length; i += concurrency) {
    const batch = gbpEntries.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async ({ loc, accountId }) => {
        const shortName = gbpShortName(loc.name);
        if (EXCLUDED_LOCATION_IDS.has(shortName)) return;
        if (!activeExternalIds.has(shortName)) return;
        // Admin → Shops name wins (rename without code change), then the
        // hardcoded map, then the live GBP title.
        const locationTitle = dbNames.get(shortName) ?? LOCATION_NAMES[shortName] ?? loc.title ?? shortName;
        processed.set(shortName, locationTitle);

        try {
          const wm = watermarks.get(shortName);
          const sinceMs = full || wm === undefined ? undefined : wm - INCREMENTAL_MARGIN_MS;
          const reviews = await fetchReviewsForLocation(accessToken, accountId, shortName, sinceMs);

          if (reviews.length === 0) return;

          const rows = reviews
            .map((r) => {
              const starNum = STAR_RATING_MAP[r.starRating as string];
              if (!starNum) return null;
              const reviewId = r.reviewId ?? r.name?.split("/").pop() ?? "";
              if (!reviewId || !r.createTime || !r.updateTime) return null;
              const locationUuid = uuidByExternalId.get(shortName) ?? null;
              return {
                id: r.name ?? reviewId,
                organization_id: DEFAULT_ORG_ID,
                location_id: shortName,
                // Dual-write: internal UUID join key (null pre-migration or
                // for reviews-only GBP locations with no `locations` row).
                ...(uuidCacheOk && locationUuid ? { location_uuid: locationUuid } : {}),
                location_title: locationTitle,
                star_rating: starNum,
                has_reply: !!r.reviewReply,
                reviewer_display_name: r.reviewer?.displayName ?? null,
                // Archive columns (pre-migration DBs stay TEXT-only).
                ...(archiveColsOk
                  ? { comment: r.comment ?? null, media_count: r.media?.length ?? 0 }
                  : {}),
                create_time: r.createTime,
                update_time: r.updateTime,
                synced_at: syncedAt,
              };
            })
            .filter(Boolean);

          if (rows.length === 0) return;

          // Full pass rewrites everything (backfills new columns); incremental
          // only writes rows that are new or whose update_time changed, to
          // avoid rewriting every review on every daily sync (Disk IO + bloat).
          let toWrite = rows;
          if (!full) {
            const ids = rows.map((r) => r!.id);
            const existingUpdateTimes = new Map<string, string>();
            for (let offset = 0; offset < ids.length; offset += 200) {
              const page = ids.slice(offset, offset + 200);
              const { data: existing } = await supabase
                .from("reviews_cache")
                .select("id, update_time")
                .in("id", page);
              for (const row of existing ?? []) {
                existingUpdateTimes.set(row.id as string, row.update_time as string);
              }
            }

            toWrite = rows.filter((r) => {
              const prev = existingUpdateTimes.get(r!.id);
              return prev === undefined || prev !== r!.update_time;
            });
          }

          if (toWrite.length === 0) return;

          const { error } = await supabase
            .from("reviews_cache")
            .upsert(toWrite, { onConflict: "id" });

          if (error) {
            console.error(`[challenges/sync] upsert error for ${shortName}:`, error.message);
          } else {
            totalSynced += toWrite.length;
          }
        } catch (e) {
          console.error(
            `[challenges/sync] failed for ${shortName}:`,
            e instanceof Error ? e.message : e,
          );
        }
      }),
    );
  }

  // All-time rating stats, aggregated from the cache itself (NOT the fetched
  // subset — under incremental mode it only holds recent pages, and the
  // challenges "Review rating" metric needs the all-time snapshot). Read
  // after the writes above so freshly synced rows are included.
  const { data: cacheRows } = await supabase
    .from("reviews_cache")
    .select("location_id, star_rating")
    .eq("organization_id", DEFAULT_ORG_ID);
  const agg = new Map<string, { ratingSum: number; count: number }>();
  for (const row of (cacheRows ?? []) as Array<{ location_id: string; star_rating: number }>) {
    const cur = agg.get(row.location_id) ?? { ratingSum: 0, count: 0 };
    cur.ratingSum += row.star_rating;
    cur.count += 1;
    agg.set(row.location_id, cur);
  }

  const ratingRows = Array.from(processed.entries()).flatMap(([locationId, title]) => {
    const stats = agg.get(locationId);
    if (!stats || stats.count === 0) return [];
    return [
      {
        location_id: locationId,
        organization_id: DEFAULT_ORG_ID,
        // Dual-write: internal UUID join key (see reviews_cache above).
        ...(uuidRatingsOk && uuidByExternalId.get(locationId)
          ? { location_uuid: uuidByExternalId.get(locationId)! }
          : {}),
        location_title: title,
        average_rating: Math.round((stats.ratingSum / stats.count) * 10) / 10,
        total_review_count: stats.count,
        synced_at: syncedAt,
      },
    ];
  });

  if (ratingRows.length > 0) {
    await supabase
      .from("location_gbp_ratings")
      .upsert(ratingRows, { onConflict: "location_id,organization_id" });
  }

  return { synced: totalSynced, locations: gbpEntries.length, syncedAt, mode: full ? "full" : "incremental" };
}
