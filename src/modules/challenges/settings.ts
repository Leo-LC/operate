import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

/**
 * Load per-shop sales-target overrides from the challenge_settings table.
 * Returns a map of normalized location key -> override amount (in THB).
 * Empty table (or any read failure) falls back to code defaults.
 */
export async function loadRevenueThresholdOverrides(): Promise<Map<string, number>> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("challenge_settings")
      .select("location_key, revenue_threshold")
      .eq("organization_id", DEFAULT_ORG_ID);
    if (error) return new Map();
    const overrides = new Map<string, number>();
    for (const row of data ?? []) overrides.set(row.location_key as string, Number(row.revenue_threshold));
    return overrides;
  } catch {
    return new Map();
  }
}