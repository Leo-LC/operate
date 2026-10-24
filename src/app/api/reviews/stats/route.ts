import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  computeReviewsStats,
  DEFAULT_PRESET,
  PERIOD_PRESETS,
  periodBounds,
  presetDef,
  type PeriodPreset,
  type StatPart,
  type StatTitle,
} from "@/modules/reviews/lib/stats";

const PRESETS = new Set<string>(PERIOD_PRESETS.map((p) => p.key));

/**
 * GET /api/reviews/stats?preset=30d&shops=locations/A,locations/B
 *
 * Reads the Google review history synced nightly into reviews_cache
 * (src/modules/challenges/lib/sync-reviews.ts) — never calls the GBP API
 * from here. Grouping happens in Postgres via the `reviews_cache_stats`
 * function (raw rows would exceed Supabase's 1000-row request cap); the
 * derived metrics, labels and shop selection are computed in the tested
 * helpers of src/modules/reviews/lib/stats.ts.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const presetParam = url.searchParams.get("preset") ?? DEFAULT_PRESET;
  const preset: PeriodPreset = PRESETS.has(presetParam) ? (presetParam as PeriodPreset) : DEFAULT_PRESET;
  const shopsParam = url.searchParams.get("shops");
  const selectedKeys = shopsParam
    ? new Set(shopsParam.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  const now = new Date();
  const { priorFrom, currentFrom, endExclusive } = periodBounds(preset, now);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("reviews_cache_stats", {
    p_prior_from: priorFrom.toISOString(),
    p_current_from: currentFrom.toISOString(),
    p_current_to: endExclusive.toISOString(),
    p_bucket: presetDef(preset).granularity,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const payload = (data ?? {}) as { titles?: StatTitle[]; parts?: StatPart[] };
  return Response.json(
    computeReviewsStats(payload.parts ?? [], payload.titles ?? [], preset, selectedKeys, now)
  );
}
