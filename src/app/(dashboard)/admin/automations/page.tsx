import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { AutomationsClient, type RecentRun } from "@/modules/admin/components/AutomationsClient";

export default async function AdminAutomationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/home");

  const supabase = getSupabaseServerClient();
  const { data: config } = await supabase
    .from("sheet_sync_config")
    .select("enabled, last_run_at, last_run_result")
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  // Best effort: `cron_runs` only exists once the observability migration has
  // been applied — an empty list must never break the page.
  const { data: runs } = await supabase
    .from("cron_runs")
    .select("id, job, triggered_by, started_at, finished_at, ok, result")
    .order("started_at", { ascending: false })
    .limit(12);

  return (
    <AutomationsClient
      initialEnabled={config?.enabled ?? false}
      lastRunAt={config?.last_run_at ?? null}
      lastRunResult={config?.last_run_result ?? null}
      recentRuns={(runs ?? []) as unknown as RecentRun[]}
    />
  );
}
