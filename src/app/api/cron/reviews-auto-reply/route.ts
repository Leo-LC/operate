import { runReviewsAutoReply } from "@/modules/reviews/lib/auto-reply";
import { verifyCronAuth, recordCronRun } from "@/lib/cron";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Reviews automation: detect-only counts, or auto-send replies when the
 * reviews_auto_config.auto_send_enabled toggle is ON.
 *
 * ⚠ Not currently scheduled: the entry was removed from vercel.json (Vercel
 * Hobby allows only 1 cron job — challenges-sync kept its slot). To enable,
 * add {"path": "/api/cron/reviews-auto-reply", "schedule": "0 2 * * *"} back to
 * vercel.json (09:00 Bangkok) and redeploy. Manual trigger works today:
 * POST/GET with the same `Bearer ${CRON_SECRET}` header the Vercel cron uses.
 *
 * 1. Always: fetch every unreplied review and record the per-rating counts in
 *    cron history (Admin → Automations).
 * 2. If the toggle is ON: also send templated replies — random generic
 *    template for written 4★/5★ reviews, star-only template for blank ones.
 *    Self-deduping: replied reviews disappear from the unreplied fetch.
 */
async function handleCron(request: Request) {
  const authErr = verifyCronAuth(request);
  if (authErr) return authErr;
  const startedAt = new Date();
  try {
    const result = await runReviewsAutoReply("cron");
    await recordCronRun(getSupabaseServerClient(), { job: "reviews-auto-reply", ok: result.ok, startedAt, result });
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordCronRun(getSupabaseServerClient(), { job: "reviews-auto-reply", ok: false, startedAt, result: { error: msg } });
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
