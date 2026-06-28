import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { importLocationFromSheet } from "@/app/api/accounting/import-sheets/lib";

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });

  const auth = request.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  const { data: config } = await supabase
    .from("sheet_sync_config")
    .select("enabled")
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (!config?.enabled) {
    return Response.json({ skipped: true, reason: "automation disabled" });
  }

  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) {
    await supabase
      .from("sheet_sync_config")
      .update({ last_run_at: new Date().toISOString(), last_run_result: { error: "Google account not connected or token expired" }, updated_at: new Date().toISOString() })
      .eq("organization_id", DEFAULT_ORG_ID);
    return Response.json({ error: "Google account not connected or token expired" }, { status: 400 });
  }

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .not("google_sheet_id", "is", null)
    .order("name");

  if (!locations || locations.length === 0) {
    const result = { error: "No locations with a Sheet ID configured" };
    await supabase
      .from("sheet_sync_config")
      .update({ last_run_at: new Date().toISOString(), last_run_result: result, updated_at: new Date().toISOString() })
      .eq("organization_id", DEFAULT_ORG_ID);
    return Response.json(result, { status: 400 });
  }

  const results = [];
  for (const loc of locations) {
    const r = await importLocationFromSheet(loc.id as string, null, accessToken, supabase);
    results.push(r);
  }

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  const failedCount = results.filter((r) => r.error).length;

  const runResult = {
    total_inserted: totalInserted,
    failed_count: failedCount,
    location_count: locations.length,
    results: results.map((r) => ({
      location_id: r.location_id,
      location_name: r.location_name,
      inserted: r.inserted,
      skipped_existing: r.skipped_existing,
      error: r.error ?? null,
    })),
  };

  await supabase
    .from("sheet_sync_config")
    .update({ last_run_at: new Date().toISOString(), last_run_result: runResult, updated_at: new Date().toISOString() })
    .eq("organization_id", DEFAULT_ORG_ID);

  return Response.json(runResult);
}
