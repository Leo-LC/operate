import { timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function timingSafeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Shared auth for scheduled endpoints. Vercel invokes every cron with an
 * HTTP GET + `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Returns `null` when the caller is authorized, otherwise the Response to
 * return: 500 when the secret is not configured, 401 on mismatch.
 */
export function verifyCronAuth(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (!timingSafeEquals(request.headers.get("Authorization") ?? "", `Bearer ${secret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Same check as `verifyCronAuth`, for routes that also accept a user session. */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return timingSafeEquals(request.headers.get("Authorization") ?? "", `Bearer ${secret}`);
}

export type CronRunInput = {
  /** Stable job name, e.g. `challenges-sync` — shown on Admin > Automations. */
  job: string;
  ok: boolean;
  triggeredBy?: "cron" | "manual";
  startedAt: Date;
  result?: unknown;
};

/**
 * Persist a scheduled run to the `cron_runs` table (best effort).
 *
 * Vercel never reads the JSON a cron route returns, so without this a failed
 * nightly sync is completely silent. Never throws and never fails the run:
 * observability must not be able to break the automation it observes
 * (e.g. when the migration creating the table has not been applied yet).
 */
export async function recordCronRun(
  supabase: SupabaseClient,
  input: CronRunInput,
): Promise<void> {
  try {
    const { error } = await supabase.from("cron_runs").insert({
      organization_id: DEFAULT_ORG_ID,
      job: input.job,
      triggered_by: input.triggeredBy ?? "cron",
      started_at: input.startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      ok: input.ok,
      result: input.result ?? null,
    });
    if (error) console.error(`[cron] failed to record run for ${input.job}:`, error.message);
  } catch (e) {
    console.error(`[cron] failed to record run for ${input.job}:`, e);
  }
}
