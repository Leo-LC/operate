import { runReviewsAutoReply } from "@/modules/reviews/lib/auto-reply";
import { verifyCronAuth, recordCronRun } from "@/lib/cron";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Daily reviews automation (09:00 Bangkok, see vercel.json):
 *
 * 1. Always: fetch every unreplied review and record the per-rating counts in
 *    cron history (Admin → Automations) so the owner sees how many new 5★/4★
 *    (and star-only) reviews arrived without opening the module.
 * 2. If `reviews_auto_config.auto_send_enabled` is ON (the holiday toggle in
 *    Reviews → Templates): also send templated replies — random generic
 *    template for written 4★/5★ reviews, star-only template for blank ones.
 *    Self-deduping: replied reviews disappear from the unreplied fetch.
 *
 * Manual trigger: POST with the same `Bearer ${CRON_SECRET}` header.
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
