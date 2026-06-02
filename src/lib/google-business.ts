import { LOCATIONS_BASE } from "@/lib/constants";
import type { Location } from "@/types/review";

type GbpAccount = { name?: string | null; accountName?: string | null };

function normalizeAccountId(name: string | null | undefined): string | null {
  if (!name || typeof name !== "string") return null;
  if (!name.startsWith("accounts/")) return null;
  return name.replace("accounts/", "");
}

export async function getPreferredAccountId(accessToken: string): Promise<string> {
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
    accounts?: GbpAccount[];
  };
  const accounts = data.accounts ?? [];
  if (accounts.length === 0) {
    throw new Error("No Business Profile accounts found for this Google user.");
  }

  // 1) Explicit override via env, supports either full "accounts/123" or just "123"
  const envAccount = (process.env.GOOGLE_BUSINESS_ACCOUNT_ID ?? "").trim();
  if (envAccount) {
    const normalized = envAccount.startsWith("accounts/") ? envAccount : `accounts/${envAccount}`;
    const explicitId = normalizeAccountId(normalized);
    if (explicitId) return explicitId;
  }

  // 2) Try each account until we find one that actually has locations.
  //    Prefer account names mentioning "Capybara", but fall back to any account
  //    that returns at least one location.
  const sorted = [...accounts].sort((a, b) => {
    const aName = (a.accountName ?? "").toLowerCase();
    const bName = (b.accountName ?? "").toLowerCase();
    const aCap = aName.includes("capybara") ? 1 : 0;
    const bCap = bName.includes("capybara") ? 1 : 0;
    return bCap - aCap;
  });

  let fallbackId: string | null = null;

  for (const acc of sorted) {
    const id = normalizeAccountId(acc.name);
    if (!id) continue;
    if (!fallbackId) fallbackId = id;
    try {
      const locations = await fetchAllLocations(accessToken, id);
      if (locations.length > 0) {
        return id;
      }
    } catch {
      // ignore and try next account
    }
  }

  if (fallbackId) return fallbackId;

  throw new Error("Unexpected account format returned by Business Profile API.");
}

export async function fetchAllLocations(
  accessToken: string,
  accountId: string
): Promise<Location[]> {
  const LOCATIONS_URL = `${LOCATIONS_BASE}/accounts/${accountId}/locations?readMask=name,title,storefrontAddress,metadata,averageRating,totalReviewCount&pageSize=100`;
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

  return locations;
}

