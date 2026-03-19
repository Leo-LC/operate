import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { LOCATION_NAMES } from "@/lib/constants";
import { fetchAllLocations, getPreferredAccountId } from "@/lib/google-business";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = (token as { accessToken?: string } | null)?.accessToken;
  if (!accessToken || !session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accountId = await getPreferredAccountId(accessToken);
    const locations = await fetchAllLocations(accessToken, accountId);

    const items = locations.map((loc) => {
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

