import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { LOCATION_NAMES, REVIEWS_BASE, REVIEWS_ONLY_LOCATION_IDS } from "@/lib/constants";
import { fetchAllLocationsAcrossAccounts, gbpShortName, getActiveLocations } from "@/lib/google-business";
import type { Review } from "@/types/review";
import type { ReviewWithLocation } from "@/types/review";

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

export interface SyncLocationDetail {
  id: string;
  title: string;
  status: "ok" | "no-gbp-entry" | "error";
  count: number;
  error?: string;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) {
    return Response.json({ error: "Google token not configured — sign in with Google first" }, { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get("locations");
    const selectedIds =
      raw && raw.length > 0
        ? raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

    const [gbpEntries, activeLocations] = await Promise.all([
      fetchAllLocationsAcrossAccounts(accessToken),
      getActiveLocations(),
    ]);
    const gbpByShort = new Map(gbpEntries.map((e) => [gbpShortName(e.loc.name), e]));
    // Shops selectable = every active DB shop (plus reviews-only), even when
    // absent from the GBP API response (new shop / propagation delay). Those
    // without a GBP entry resolve to 0 reviews with a logged error instead of
    // being silently dropped (the Karon bug).
    const selectableShorts = new Set<string>(
      Array.from(activeLocations.keys()).concat(Array.from(REVIEWS_ONLY_LOCATION_IDS))
    );
    const wantedShorts =
      selectedIds && selectedIds.length > 0
        ? selectedIds.filter((id) => selectableShorts.has(id))
        : Array.from(selectableShorts);
    // Also honour a GBP location that has no DB row yet (shouldn't happen,
    // but keeps back-compat with the old GBP-driven behaviour).
    gbpByShort.forEach((_entry, short) => {
      if (!selectedIds || selectedIds.includes(short)) selectableShorts.add(short);
    });
    const filteredShorts =
      selectedIds && selectedIds.length > 0
        ? wantedShorts
        : Array.from(selectableShorts).filter((s) => gbpByShort.has(s) || wantedShorts.includes(s));

    const allUnreplied: ReviewWithLocation[] = [];
    const details: SyncLocationDetail[] = [];
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
            console.error("[sync] no GBP entry for selected location", shortName);
            return { reviews: [] as ReviewWithLocation[], detail: { id: shortName, title, status: "no-gbp-entry", count: 0, error } as SyncLocationDetail };
          }
          try {
            const reviews = await fetchUnrepliedReviewsForLocation(
              accessToken,
              entry.accountId,
              shortName,
              title,
              placeId
            );
            return { reviews, detail: { id: shortName, title, status: "ok", count: reviews.length } as SyncLocationDetail };
          } catch (e) {
            const error = e instanceof Error ? e.message : String(e);
            console.error("[sync] failed to fetch reviews for location", shortName, error);
            return { reviews: [] as ReviewWithLocation[], detail: { id: shortName, title, status: "error", count: 0, error } as SyncLocationDetail };
          }
        })
      );
      for (const { reviews, detail } of results) {
        allUnreplied.push(...reviews);
        details.push(detail);
      }
    }

    return Response.json({ reviews: allUnreplied, details });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

