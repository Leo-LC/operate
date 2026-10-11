import { DEFAULT_ORG_ID, LOCATIONS_BASE } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Location } from "@/types/review";

// Google Business Profile locations whose corresponding `locations` row is missing
// (e.g. deleted, like the old resort) or not yet active (e.g. "opening soon", like
// Laguna pre-launch) must stay out of reviews/challenges entirely.
// Active `locations` rows: GBP external id → Admin display name.
// Display resolution everywhere (reviews list, sync, challenges) must prefer
// this map so a rename in Admin → Shops applies without a code change.
// LOCATION_NAMES in src/lib/constants.ts stays as fallback for GBP locations
// with no DB row (reviews-only) and for stale cached ids.
export async function getActiveLocations(): Promise<Map<string, string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .select("name, external_id")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .not("external_id", "is", null);
  if (error) throw new Error(`Failed to load active locations: ${error.message}`);
  return new Map(
    ((data ?? []) as Array<{ name: string; external_id: string }>).map((row) => [
      row.external_id,
      row.name,
    ])
  );
}

export async function getActiveLocationExternalIds(): Promise<Set<string>> {
  return new Set(Array.from((await getActiveLocations()).keys()));
}

export type GbpAccount = { name?: string | null; accountName?: string | null };

export interface GbpLocationWithAccount {
  loc: Location;
  accountId: string;
}

export function gbpShortName(fullName: string): string {
  return fullName.replace(/^accounts\/[^/]+\//, "");
}

export async function listGbpAccounts(accessToken: string): Promise<GbpAccount[]> {
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
  return data.accounts ?? [];
}

function sortAccountsCapybaraFirst(accounts: GbpAccount[]): GbpAccount[] {
  return [...accounts].sort((a, b) => {
    const aName = (a.accountName ?? "").toLowerCase();
    const bName = (b.accountName ?? "").toLowerCase();
    const aCap = aName.includes("capybara") ? 1 : 0;
    const bCap = bName.includes("capybara") ? 1 : 0;
    return bCap - aCap;
  });
}

function normalizeAccountId(name: string | null | undefined): string | null {
  if (!name || typeof name !== "string") return null;
  if (!name.startsWith("accounts/")) return null;
  return name.replace("accounts/", "");
}

export async function getPreferredAccountId(accessToken: string): Promise<string> {
  const accounts = await listGbpAccounts(accessToken);
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
  const sorted = sortAccountsCapybaraFirst(accounts);

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

  return locations;
}

/**
 * Fetch GBP locations across ALL accessible accounts (not just the preferred
 * one). Karon was invisible because getPreferredAccountId() stopped at the
 * first account with locations — a shop living under a second account was
 * silently dropped everywhere (reviews list, sync, challenges).
 *
 * With GOOGLE_BUSINESS_ACCOUNT_ID set, behaves like before (single account).
 * Otherwise merges every account, deduped by GBP short id (Capybara-named
 * accounts win on conflict).
 */
export async function fetchAllLocationsAcrossAccounts(
  accessToken: string
): Promise<GbpLocationWithAccount[]> {
  const envAccount = (process.env.GOOGLE_BUSINESS_ACCOUNT_ID ?? "").trim();
  if (envAccount) {
    const normalized = envAccount.startsWith("accounts/") ? envAccount : `accounts/${envAccount}`;
    const explicitId = normalizeAccountId(normalized);
    if (explicitId) {
      const locations = await fetchAllLocations(accessToken, explicitId);
      return locations.map((loc) => ({ loc, accountId: explicitId }));
    }
  }

  const accounts = sortAccountsCapybaraFirst(await listGbpAccounts(accessToken));
  console.log(`[gbp] ${accounts.length} account(s) accessible`);
  const merged = new Map<string, GbpLocationWithAccount>();
  for (const acc of accounts) {
    const id = normalizeAccountId(acc.name);
    if (!id) continue;
    let locations: Location[];
    try {
      locations = await fetchAllLocations(accessToken, id);
    } catch (e) {
      console.error("[gbp] failed to list locations for account", id, e instanceof Error ? e.message : e);
      continue;
    }
    console.log(
      `[gbp] account ${id} (${acc.accountName ?? "?"}): ${locations.length} location(s):`,
      locations.map((l) => gbpShortName(l.name)).join(", ")
    );
    for (const loc of locations) {
      const short = gbpShortName(loc.name);
      if (!merged.has(short)) merged.set(short, { loc, accountId: id });
    }
  }
  return Array.from(merged.values());
}

/** Owning account for one GBP short id (scans all accounts). Null when absent. */
export async function findAccountForLocation(
  accessToken: string,
  shortName: string
): Promise<string | null> {
  const envAccount = (process.env.GOOGLE_BUSINESS_ACCOUNT_ID ?? "").trim();
  if (envAccount) {
    const normalized = envAccount.startsWith("accounts/") ? envAccount : `accounts/${envAccount}`;
    const explicitId = normalizeAccountId(normalized);
    if (explicitId) return explicitId;
  }
  const all = await fetchAllLocationsAcrossAccounts(accessToken);
  return all.find((e) => gbpShortName(e.loc.name) === shortName)?.accountId ?? null;
}

