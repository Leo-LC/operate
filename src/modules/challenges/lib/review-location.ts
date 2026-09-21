import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ORG_ID } from "@/lib/constants";

/**
 * Review tables (`reviews_cache`, `location_gbp_ratings`) historically join
 * on the GBP TEXT id (`location_id = "locations/123…"`), not the internal
 * `locations.id` UUID. Migration 20260923000000 adds `location_uuid` as the
 * join key (written on every sync, backfilled for history).
 *
 * Helpers here are tolerant: they prefer `location_uuid` but keep working
 * when the migration hasn't been applied yet (or for reviews-only GBP
 * locations with no row in `locations`). Remove the fallbacks once the
 * migration is applied everywhere.
 */

export interface ReviewJoinRow {
  location_id: string;
  location_uuid?: string | null;
  location_title: string;
}

/** GBP TEXT id → internal UUID, built from `locations(id, external_id)`. */
export function buildGbpToUuidMap(
  locations: Array<{ id: string; external_id: string | null }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const loc of locations ?? []) {
    if (loc.external_id) map.set(loc.external_id, String(loc.id));
  }
  return map;
}

/**
 * Canonical join key for a review/ratings row: the stored internal UUID when
 * present, else the UUID resolved via the GBP map for legacy rows, else the
 * GBP TEXT id (reviews-only locations with no `locations` row).
 */
export function reviewJoinKey(
  row: { location_id: string; location_uuid?: string | null },
  gbpToUuid: Map<string, string>,
): string {
  if (row.location_uuid) return row.location_uuid;
  return gbpToUuid.get(row.location_id) ?? row.location_id;
}

function isMissingColumn(error: { message: string }): boolean {
  return /location_uuid/.test(error.message);
}

export interface GbpRatingRow extends ReviewJoinRow {
  average_rating: number;
  total_review_count: number;
}

const RATINGS_WITH_UUID =
  "location_id, location_uuid, location_title, average_rating, total_review_count";
const RATINGS_LEGACY =
  "location_id, location_title, average_rating, total_review_count";

/** Prefer `location_uuid`; fall back to the legacy TEXT select pre-migration. */
export async function selectGbpRatings(
  supabase: SupabaseClient,
): Promise<GbpRatingRow[]> {
  const attempt = await supabase
    .from("location_gbp_ratings")
    .select(RATINGS_WITH_UUID)
    .eq("organization_id", DEFAULT_ORG_ID);
  if (!attempt.error) {
    return ((attempt.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      location_id: String(r.location_id),
      location_uuid: (r.location_uuid as string | null) ?? null,
      location_title: String(r.location_title),
      average_rating: Number(r.average_rating),
      total_review_count: Number(r.total_review_count),
    }));
  }
  if (!isMissingColumn(attempt.error)) throw new Error(attempt.error.message);
  const fallback = await supabase
    .from("location_gbp_ratings")
    .select(RATINGS_LEGACY)
    .eq("organization_id", DEFAULT_ORG_ID);
  if (fallback.error) throw new Error(fallback.error.message);
  return ((fallback.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    location_id: String(r.location_id),
    location_uuid: null,
    location_title: String(r.location_title),
    average_rating: Number(r.average_rating),
    total_review_count: Number(r.total_review_count),
  }));
}

export interface CachedReviewRow extends ReviewJoinRow {
  star_rating: number;
  synced_at: string;
}

const REVIEWS_WITH_UUID =
  "location_id, location_uuid, location_title, star_rating, synced_at";
const REVIEWS_LEGACY = "location_id, location_title, star_rating, synced_at";

/** Prefer `location_uuid`; fall back to the legacy TEXT select pre-migration. */
export async function selectReviewsCache(
  supabase: SupabaseClient,
  rangeStart: string,
  rangeEnd: string,
): Promise<CachedReviewRow[]> {
  const attempt = await supabase
    .from("reviews_cache")
    .select(REVIEWS_WITH_UUID)
    .eq("organization_id", DEFAULT_ORG_ID)
    .gte("create_time", rangeStart)
    .lt("create_time", rangeEnd);
  if (!attempt.error) {
    return ((attempt.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      location_id: String(r.location_id),
      location_uuid: (r.location_uuid as string | null) ?? null,
      location_title: String(r.location_title),
      star_rating: Number(r.star_rating),
      synced_at: String(r.synced_at),
    }));
  }
  if (!isMissingColumn(attempt.error)) throw new Error(attempt.error.message);
  const fallback = await supabase
    .from("reviews_cache")
    .select(REVIEWS_LEGACY)
    .eq("organization_id", DEFAULT_ORG_ID)
    .gte("create_time", rangeStart)
    .lt("create_time", rangeEnd);
  if (fallback.error) throw new Error(fallback.error.message);
  return ((fallback.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    location_id: String(r.location_id),
    location_uuid: null,
    location_title: String(r.location_title),
    star_rating: Number(r.star_rating),
    synced_at: String(r.synced_at),
  }));
}
