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
    const result = await syncReviews();
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    const status = message.includes("Google token") ? 503 : 500;
    return Response.json({ error: message }, { status });
  }
}
