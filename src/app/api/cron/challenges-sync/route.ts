import { syncAllChallenges } from "@/modules/challenges/lib/sync-all";

function checkAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = request.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

/**
 * Nightly sequential pipeline for challenges (replaces the 3 parallel crons
 * loyverse-sync / loyverse-challenges / reviews-sync).
 * Order: sheets (costs) → loyverse snapshots → write-back sales →
 * challenge counters → reviews.
 *
 * Optional `?since=YYYY-MM-DD` (Bangkok): retroactive mode — rewrites Loyverse
 * snapshots with force=true from `since` to today and replays the write-back
 * over the range (capped at 30 days). Use after a mapping change, e.g.
 * `POST /api/cron/challenges-sync?since=2026-09-01`.
 */
async function handleCron(request: Request) {
  const authErr = checkAuth(request);
  if (authErr) return authErr;
  const url = new URL(request.url);
  const since = url.searchParams.get("since") ?? undefined;
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return Response.json({ error: "Invalid since — expected YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const result = await syncAllChallenges({ triggeredBy: "cron", since });
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}
export async function POST(request: Request) {
  return handleCron(request);
}
