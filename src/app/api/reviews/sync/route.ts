import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  EXCLUDED_LOCATION_IDS,
  LOCATION_NAMES,
  LOCATIONS_BASE,
  REVIEWS_BASE,
} from "@/lib/constants";
import type { Review, Location } from "@/types/review";
import type { ReviewWithLocation } from "@/types/review";

async function getFirstAccountId(accessToken: string): Promise<string> {
  const res = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Accounts API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    accounts?: { name?: string | null; accountName?: string | null }[];
  };
  const accounts = data.accounts ?? [];
  if (accounts.length === 0) {
    throw new Error("No Business Profile accounts found for this Google user.");
  }
  if (accounts.length > 1) {
    const names = accounts
      .map((a) => a.accountName || a.name || "unknown")
      .slice(0, 3)
      .join(", ");
    throw new Error(
      `Multiple Business Profile accounts found (${names}). This app currently supports one account per user.`
    );
  }
  const name = accounts[0].name;
  if (!name || !name.startsWith("accounts/")) {
    throw new Error("Unexpected account format returned by Business Profile API.");
  }
  return name.replace("accounts/", "");
}

async function fetchAllLocations(
  accessToken: string,
  accountId: string
): Promise<Location[]> {
  const LOCATIONS_URL = `${LOCATIONS_BASE}/accounts/${accountId}/locations?readMask=name,title,storefrontAddress,metadata&pageSize=100`;
  const locations: Location[] = [];
  let pageToken: string | undefined;

  do {
    const url = pageToken ? `${LOCATIONS_URL}&pageToken=${pageToken}` : LOCATIONS_URL;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Locations API error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      locations?: Location[];
      nextPageToken?: string;
    };
    if (data.locations) locations.push(...data.locations);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return locations.filter((loc) => {
    const id = loc.name?.replace(/^accounts\/[^/]+\//, "") ?? "";
    return !EXCLUDED_LOCATION_IDS.has(id);
  });
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

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accountId = await getFirstAccountId(accessToken);
    const locations = await fetchAllLocations(accessToken, accountId);
    const allUnreplied: ReviewWithLocation[] = [];

    for (const loc of locations) {
      const shortName = loc.name.replace(/^accounts\/[^/]+\//, "");
      const title = LOCATION_NAMES[shortName] ?? loc.title ?? shortName;
      const placeId = loc.metadata?.placeId;
      const reviews = await fetchUnrepliedReviewsForLocation(
        accessToken,
        accountId,
        shortName,
        title,
        placeId
      );
      allUnreplied.push(...reviews);
    }

    return Response.json({ reviews: allUnreplied });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
