import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncReviews } from "@/modules/challenges/lib/sync-reviews";

export async function POST(request: Request) {
  // Accept either a valid session (manual trigger) or CRON_SECRET bearer token
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
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
