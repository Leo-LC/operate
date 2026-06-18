import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { LOCATION_NAMES } from "@/lib/constants";
import { fetchAllLocations, getActiveLocationExternalIds, getPreferredAccountId } from "@/lib/google-business";

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
    const accountId = await getPreferredAccountId(accessToken);
    const [locations, activeExternalIds] = await Promise.all([
      fetchAllLocations(accessToken, accountId),
      getActiveLocationExternalIds(),
    ]);

    const items = locations
      .filter((loc) => {
        const shortName = loc.name.replace(/^accounts\/[^/]+\//, "");
        return activeExternalIds.has(shortName);
      })
      .map((loc) => {
        const shortName = loc.name.replace(/^accounts\/[^/]+\//, "");
        return {
          id: shortName,
          title: LOCATION_NAMES[shortName] ?? loc.title ?? shortName,
          address: loc.storefrontAddress?.addressLines?.join(", ") ?? null,
          locality: loc.storefrontAddress?.locality ?? null,
          placeId: loc.metadata?.placeId ?? null,
        };
      });

    return Response.json({ locations: items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load locations";
    return Response.json({ error: message }, { status: 500 });
  }
}

