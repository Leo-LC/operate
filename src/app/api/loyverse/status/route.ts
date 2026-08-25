import { getAccounts } from "@/lib/loyverse/accounts";
import { isLoyverseConfigured } from "@/lib/loyverse/client";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";

export async function GET() {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;

  const configured = isLoyverseConfigured();
  const accounts = getAccounts().map((a) => ({ key: a.key, label: a.label }));

  let lastRun: Record<string, unknown> | null = null;
  let snapshotCount = 0;
  let error: string | null = null;

  if (configured) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: run } = await supabase
        .from("loyverse_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastRun = run ?? null;

      if (guard.allowedLocationIds !== null && guard.allowedLocationIds.length === 0) {
        snapshotCount = 0;
      } else {
        let countQuery = supabase
          .from("loyverse_daily_snapshots")
          .select("id", { count: "exact", head: true });
        if (guard.allowedLocationIds !== null) {
          countQuery = countQuery.in("location_id", guard.allowedLocationIds);
        }
        const { count } = await countQuery;
        snapshotCount = count ?? 0;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  return Response.json({
    configured,
    accounts,
    account_count: accounts.length,
    last_run: lastRun,
    snapshot_count: snapshotCount,
    error,
  });
}
