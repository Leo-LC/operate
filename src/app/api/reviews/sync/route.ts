import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { LOCATION_NAMES, REVIEWS_BASE } from "@/lib/constants";
import { fetchAllLocations, getPreferredAccountId } from "@/lib/google-business";
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
    const accountId = await getPreferredAccountId(accessToken);
    const url = new URL(request.url);
    const raw = url.searchParams.get("locations");
    const selectedIds =
      raw && raw.length > 0
        ? raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

    const locations = await fetchAllLocations(accessToken, accountId);
    const filteredLocations =
      selectedIds && selectedIds.length > 0
        ? locations.filter((loc) => {
            const shortName = loc.name.replace(/^accounts\/[^/]+\//, "");
            return selectedIds.includes(shortName);
          })
        : locations;

    const allUnreplied: ReviewWithLocation[] = [];
    const concurrency = 4;

    for (let i = 0; i < filteredLocations.length; i += concurrency) {
      const batch = filteredLocations.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map(async (loc) => {
          const shortName = loc.name.replace(/^accounts\/[^/]+\//, "");
          const title = LOCATION_NAMES[shortName] ?? loc.title ?? shortName;
          const placeId = loc.metadata?.placeId;
          try {
            const reviews = await fetchUnrepliedReviewsForLocation(
              accessToken,
              accountId,
              shortName,
              title,
              placeId
            );
            return reviews;
          } catch (e) {
            console.error(
              "[sync] failed to fetch reviews for location",
              shortName,
              e instanceof Error ? e.message : e
            );
            return [] as ReviewWithLocation[];
          }
        })
      );
      for (const list of results) {
        allUnreplied.push(...list);
      }
    }

    return Response.json({ reviews: allUnreplied });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

