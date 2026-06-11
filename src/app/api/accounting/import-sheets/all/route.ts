import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { importLocationFromSheet, type ImportLocationResult } from "../lib";

// Accepts either owner session auth (UI button) or CRON_SECRET bearer token (automated runs)
function isAuthorized(request: Request, role: string | undefined): boolean {
  if (role === "owner") return true;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization") ?? "";
    if (auth === `Bearer ${cronSecret}`) return true;
  }
  return false;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(request, session?.user?.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session?.user?.userId ?? null;

  let body: { preview?: boolean; location_ids?: string[] } = {};
  try { body = await request.json(); } catch { /* empty body is fine */ }
  const { preview = false, location_ids } = body;

  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) return Response.json({ error: "Google account not connected or token expired." }, { status: 400 });

  const supabase = getSupabaseServerClient();

  // Get all active locations that have a sheet configured
  let locQuery = supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .not("google_sheet_id", "is", null)
    .order("name");

  if (location_ids && location_ids.length > 0) locQuery = locQuery.in("id", location_ids);

  const { data: locations, error: locErr } = await locQuery;
  if (locErr) return Response.json({ error: locErr.message }, { status: 500 });
  if (!locations || locations.length === 0) return Response.json({ error: "No locations with a Sheet ID configured." }, { status: 400 });

  // Process each location sequentially
  const results: ImportLocationResult[] = [];
  for (const loc of locations) {
    const result = await importLocationFromSheet(loc.id as string, userId, accessToken, supabase, preview);
    results.push(result);
  }

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  const totalWouldInsert = results.reduce((s, r) => s + (r.would_insert ?? 0), 0);
  const totalSkipped  = results.reduce((s, r) => s + r.skipped_existing, 0);
  const failed        = results.filter((r) => r.error);

  return Response.json({ preview, results, total_inserted: totalInserted, total_would_insert: totalWouldInsert, total_skipped: totalSkipped, failed_count: failed.length });
}
