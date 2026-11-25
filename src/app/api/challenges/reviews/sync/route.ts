import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isCronRequest } from "@/lib/cron";
import { syncReviews } from "@/modules/challenges/lib/sync-reviews";

export async function POST(request: Request) {
  // Accept either a valid session (manual trigger) or CRON_SECRET bearer token
  if (!isCronRequest(request)) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // ?full=1 → rewrite every review (backfills comment/media_count on
    // existing rows; see sync-reviews.ts). Default is incremental.
    const full = new URL(request.url).searchParams.get("full") === "1";
    const result = await syncReviews({ full });
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    const status = message.includes("Google token") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
