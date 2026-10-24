import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { fetchUnrepliedAcrossLocations } from "@/modules/reviews/lib/auto-reply";

/** Thin session-authed wrapper over the shared fetch logic — the inbox's
 *  "Sync unreplied reviews" button (Reviews → Templates → Locations selection) */
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

    const { reviews, details } = await fetchUnrepliedAcrossLocations(accessToken, selectedIds);
    return Response.json({ reviews, details });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
