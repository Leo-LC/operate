import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID, LOCATION_NAMES, REVIEWS_ONLY_LOCATION_IDS } from "@/lib/constants";
import { fetchAllLocationsAcrossAccounts, gbpShortName } from "@/lib/google-business";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) {
    return Response.json({ error: "Google token not configured — sign in with Google first" }, { status: 503 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const [gbpEntries, dbActive] = await Promise.all([
      fetchAllLocationsAcrossAccounts(accessToken),
      supabase
        .from("locations")
        .select("name, external_id")
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("is_active", true)
        .not("external_id", "is", null),
    ]);
    if (dbActive.error) throw new Error(`Failed to load active locations: ${dbActive.error.message}`);
    const activeExternalIds = new Set(
      ((dbActive.data ?? []) as Array<{ external_id: string }>).map((r) => r.external_id)
    );
    const dbNameByExternalId = new Map(
      ((dbActive.data ?? []) as Array<{ name: string; external_id: string }>).map((r) => [
        r.external_id,
        r.name,
      ])
    );

    const items = gbpEntries
      .filter(({ loc }) => {
        const shortName = gbpShortName(loc.name);
        return activeExternalIds.has(shortName) || REVIEWS_ONLY_LOCATION_IDS.has(shortName);
      })
      .map(({ loc }) => {
        const shortName = gbpShortName(loc.name);
        return {
          id: shortName,
          title: LOCATION_NAMES[shortName] ?? loc.title ?? shortName,
          address: loc.storefrontAddress?.addressLines?.join(", ") ?? null,
          locality: loc.storefrontAddress?.locality ?? null,
          placeId: loc.metadata?.placeId ?? null,
        };
      });

    // DB fallback: an active `locations` row whose GBP id is absent from the
    // GBP API response (new shop, second account without access, propagation
    // delay…) must still be listed so it can be selected — otherwise Karon
    // stays invisible with no clue why. Sync will return 0 reviews for it
    // and log the per-location error, instead of hiding the shop.
    const seen = new Set(items.map((i) => i.id));
    dbNameByExternalId.forEach((name, externalId) => {
      if (seen.has(externalId) || REVIEWS_ONLY_LOCATION_IDS.has(externalId)) return;
      // Only list shops we know how to label (LOCATION_NAMES) or that carry
      // a DB name — never invent entries.
      items.push({
        id: externalId,
        title: LOCATION_NAMES[externalId] ?? name ?? externalId,
        address: null,
        locality: null,
        placeId: null,
      });
      seen.add(externalId);
    });
    items.sort((a, b) => a.title.localeCompare(b.title));

    const gbpShorts = new Set(gbpEntries.map(({ loc }) => gbpShortName(loc.name)));
    activeExternalIds.forEach((externalId) => {
      if (!gbpShorts.has(externalId)) {
        console.warn("[locations] active DB location missing from GBP API:", externalId);
      }
    });

    return Response.json({ locations: items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load locations";
    return Response.json({ error: message }, { status: 500 });
  }
}

