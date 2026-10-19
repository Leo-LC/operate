import { syncAllChallenges } from "@/modules/challenges/lib/sync-all";
import { verifyCronAuth, recordCronRun } from "@/lib/cron";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * THE app's nightly cron — the only one in vercel.json (23:30 Thailand time,
 * i.e. after shops close at ~21:00). Sequential pipeline for challenges and
 * every other daily sync: sheets → Loyverse → write-back → counters → reviews
 * → finance mirror.
 *
 * Optional `?since=YYYY-MM-DD` (Bangkok): retroactive mode — rewrites Loyverse
 * snapshots with force=true from `since` to today and replays the write-back
 * over the range (capped at 30 days). Use after a mapping change, e.g.
 * `POST /api/cron/challenges-sync?since=2026-09-01`.
 */
async function handleCron(request: Request) {
  const authErr = verifyCronAuth(request);
  if (authErr) return authErr;
  const startedAt = new Date();
  const url = new URL(request.url);
  const since = url.searchParams.get("since") ?? undefined;
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return Response.json({ error: "Invalid since — expected YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const result = await syncAllChallenges({ triggeredBy: "cron", since });
    // Best effort: Vercel never reads this JSON, so a failed nightly run would
    // otherwise be silent. Never throws (see recordCronRun).
    await recordCronRun(getSupabaseServerClient(), { job: "challenges-sync", ok: result.ok, startedAt, result });
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordCronRun(getSupabaseServerClient(), { job: "challenges-sync", ok: false, startedAt, result: { error: msg } });
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
