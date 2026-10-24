import {
  LOCATION_NAMES,
  REVIEWS_BASE,
  REVIEWS_ONLY_LOCATION_IDS,
  pickRandomTemplate,
} from "@/lib/constants";
import {
  fetchAllLocationsAcrossAccounts,
  getActiveLocations,
  gbpShortName,
} from "@/lib/google-business";
import type { Review } from "@/types/review";
import type { ReviewWithLocation } from "@/types/review";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { readAutoSendEnabled, readStoredReplyConfig } from "@/modules/reviews/lib/server-config";

/**
 * Shared review-fetch + reply logic for:
 * - GET /api/reviews/sync (the inbox, session-authed via the route)
 * - /api/cron/reviews-auto-reply (CRON_SECRET-authed scheduled run)
 */

export interface SyncLocationDetail {
  id: string;
  title: string;
  status: "ok" | "no-gbp-entry" | "error";
  count: number;
  error?: string;
}

async function fetchUnrepliedReviewsForLocation(
  accessToken: string,
  accountId: string,
  locationName: string,
  locationTitle: string,
  placeId?: string
): Promise<ReviewWithLocation[]> {
  const out: ReviewWithLocation[] = [];
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
    const data = (await res.json()) as {
      reviews?: Review[];
      nextPageToken?: string;
    };
    if (data.reviews) {
      for (const r of data.reviews) {
        if (!r.reviewReply) {
          const reviewId = r.reviewId ?? r.name?.split("/").pop() ?? "";
          out.push({
            ...r,
            reviewId,
            locationName,
            locationTitle,
            placeId,
          });
        }
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return out;
}

export interface FetchUnrepliedResult {
  reviews: ReviewWithLocation[];
  details: SyncLocationDetail[];
  /** accountId per location short name — reused when posting replies. */
  accountByLocation: Map<string, string>;
}

/** Fetch every unreplied review. `selectedShorts` === null means all shops
 *  (the cron path); the sync route passes the admin's location selection.
 *  The gist of the selection rules (see also the sync route doc):
 *  - shops = active DB rows + REVIEWS_ONLY_LOCATION_IDS, plus any GBP entry
 *    with no DB row (back-compat);
 *  - shops missing from the GBP API response report an error instead of
 *    being silently dropped (the Karon bug). */
export async function fetchUnrepliedAcrossLocations(
  accessToken: string,
  selectedShorts: string[] | null = null
): Promise<FetchUnrepliedResult> {
  const [gbpEntries, activeLocations] = await Promise.all([
    fetchAllLocationsAcrossAccounts(accessToken),
    getActiveLocations(),
  ]);
  const gbpByShort = new Map(gbpEntries.map((e) => [gbpShortName(e.loc.name), e]));
  const selectableShorts = new Set<string>(
    Array.from(activeLocations.keys()).concat(Array.from(REVIEWS_ONLY_LOCATION_IDS))
  );
  const wantedShorts =
    selectedShorts && selectedShorts.length > 0
      ? selectedShorts.filter((id) => selectableShorts.has(id))
      : Array.from(selectableShorts);
  gbpByShort.forEach((_entry, short) => {
    if (!selectedShorts || selectedShorts.includes(short)) selectableShorts.add(short);
  });
  const filteredShorts =
    selectedShorts && selectedShorts.length > 0
      ? wantedShorts
      : Array.from(selectableShorts).filter((s) => gbpByShort.has(s) || wantedShorts.includes(s));

  const allUnreplied: ReviewWithLocation[] = [];
  const details: SyncLocationDetail[] = [];
  const accountByLocation = new Map<string, string>();
  const concurrency = 4;

  for (let i = 0; i < filteredShorts.length; i += concurrency) {
    const batch = filteredShorts.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (shortName) => {
        const entry = gbpByShort.get(shortName);
        // Admin → Shops name wins (rename without code change), then the
        // hardcoded map, then the live GBP title.
        const title =
          activeLocations.get(shortName) ?? LOCATION_NAMES[shortName] ?? entry?.loc.title ?? shortName;
        const placeId = entry?.loc.metadata?.placeId;
        if (!entry) {
          const error =
            "Absent from Business Profile API — check the GBP location ID in Admin → Shops and the Google account access";
          console.error("[reviews] no GBP entry for selected location", shortName);
          return {
            reviews: [] as ReviewWithLocation[],
            detail: { id: shortName, title, status: "no-gbp-entry", count: 0, error } as SyncLocationDetail,
            accountId: null as string | null,
          };
        }
        try {
          const reviews = await fetchUnrepliedReviewsForLocation(
            accessToken,
            entry.accountId,
            shortName,
            title,
            placeId
          );
          return {
            reviews,
            detail: { id: shortName, title, status: "ok", count: reviews.length } as SyncLocationDetail,
            accountId: entry.accountId as string | null,
          };
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          console.error("[reviews] failed to fetch reviews for location", shortName, error);
          return {
            reviews: [] as ReviewWithLocation[],
            detail: { id: shortName, title, status: "error", count: 0, error } as SyncLocationDetail,
            accountId: null as string | null,
          };
        }
      })
    );
    for (const { reviews, detail, accountId } of results) {
      allUnreplied.push(...reviews);
      details.push(detail);
      if (accountId) accountByLocation.set(detail.id, accountId);
    }
  }

  return { reviews: allUnreplied, details, accountByLocation };
}

export async function postReply(
  accessToken: string,
  accountId: string,
  locationName: string,
  reviewId: string,
  comment: string
): Promise<void> {
  const url = `${REVIEWS_BASE}/accounts/${accountId}/${locationName}/reviews/${reviewId}/reply`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Reply failed for ${reviewId} with status ${res.status}: ${err}`);
  }
}

export function starOf(r: ReviewWithLocation): number {
  return r.starRating === "FIVE"
    ? 5
    : r.starRating === "FOUR"
      ? 4
      : r.starRating === "THREE"
        ? 3
        : r.starRating === "TWO"
          ? 2
          : r.starRating === "ONE"
            ? 1
            : 0;
}

export interface AutoReplySummary {
  ok: boolean;
  mode: "detect-only" | "auto-send";
  found: {
    total: number;
    fiveWritten: number;
    fiveStarOnly: number;
    fourWritten: number;
    fourStarOnly: number;
    lowStar: number;
  };
  sent?: number;
  failed?: number;
  failures?: { reviewId: string; error: string }[];
}

/**
 * One run of the daily reviews automation, shared by the cron route
 * (triggeredBy "cron") and manual triggers.
 *
 * Toggle stored in `reviews_auto_config.auto_send_enabled`:
 * - OFF → detect only: count unreplied reviews, record in cron history.
 * - ON  → detect, then auto-send: random generic template for written 4/5★
 *         reviews, star-only template for blank ones. Self-deduping — once a
 *         reply exists, the review disappears from the unreplied fetch.
 */
export async function runReviewsAutoReply(triggeredBy: "cron" | "manual" = "cron"): Promise<AutoReplySummary> {
  void triggeredBy;

  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) {
    throw new Error("Google token not configured — no organization refresh token stored");
  }

  const { templates, rules } = await readStoredReplyConfig();

  const { reviews, accountByLocation } = await fetchUnrepliedAcrossLocations(accessToken, null);

  const found: AutoReplySummary["found"] = {
    total: reviews.length,
    fiveWritten: 0,
    fiveStarOnly: 0,
    fourWritten: 0,
    fourStarOnly: 0,
    lowStar: 0,
  };
  for (const r of reviews) {
    const n = starOf(r);
    const hasText = Boolean((r.comment ?? "").trim());
    if (n === 5) {
      if (hasText) found.fiveWritten += 1;
      else found.fiveStarOnly += 1;
    } else if (n === 4) {
      if (hasText) found.fourWritten += 1;
      else found.fourStarOnly += 1;
    } else {
      found.lowStar += 1;
    }
  }

  const autoSend = (await readAutoSendEnabled()) === true;

  if (!autoSend) {
    return { ok: true, mode: "detect-only", found };
  }

  const inScope = reviews.filter((r) => {
    const n = starOf(r);
    return (n === 5 || n === 4) && rules[n]?.mode === "template";
  });

  const summary: AutoReplySummary = { ok: true, mode: "auto-send", found, sent: 0, failed: 0, failures: [] };
  for (const r of inScope) {
    const n = starOf(r) as 4 | 5;
    const hasText = Boolean((r.comment ?? "").trim());
    const comment = pickRandomTemplate(n, hasText ? "generic" : "star_only", templates);
    if (!comment) continue;

    const accountId = accountByLocation.get(r.locationName);
    if (!accountId) {
      summary.failed = (summary.failed ?? 0) + 1;
      summary.failures!.push({ reviewId: r.reviewId, error: "No GBP account for location" });
      continue;
    }

    try {
      await postReply(accessToken, accountId, r.locationName, r.reviewId, comment);
      summary.sent = (summary.sent ?? 0) + 1;
    } catch (e) {
      summary.failed = (summary.failed ?? 0) + 1;
      summary.failures!.push({ reviewId: r.reviewId, error: e instanceof Error ? e.message : String(e) });
    }
  }

  summary.ok = (summary.failed ?? 0) === 0 || (summary.sent ?? 0) > 0;
  return summary;
}
