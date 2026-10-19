import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { importLocationFromSheet } from "./lib";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("sheet_import_batches")
    .select("id, location_id, imported_by, imported_at, row_count, reverted_at, reverted_by, locations(name)")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("imported_at", { ascending: false })
    .limit(50);

  if (locationId) query = query.eq("location_id", locationId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { location_id?: string; preview?: boolean };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { location_id: locationId, preview = false } = body;
  if (!locationId) return Response.json({ error: "location_id is required" }, { status: 400 });

  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) return Response.json({ error: "Google account not connected or token expired. Please sign out and back in." }, { status: 400 });

  // Preview mode — parse the sheet without writing, compare with existing DB
  // entries. Same code path as the real import (importLocationFromSheet), which
  // already supports preview: this used to be a third copy of the parser loop.
  if (preview) {
    const supabase = getSupabaseServerClient();
    const { data: loc } = await supabase.from("locations").select("id, name, google_sheet_id").eq("id", locationId).eq("organization_id", DEFAULT_ORG_ID).single();
    if (!loc) return Response.json({ error: "Location not found" }, { status: 400 });
    if (!loc.google_sheet_id) return Response.json({ error: "No Google Sheet ID configured for this location." }, { status: 400 });

    const result = await importLocationFromSheet(locationId, session.user.userId ?? null, accessToken, supabase, true);
    if (result.error) return Response.json({ error: result.error }, { status: 400 });

    if (result.would_insert) {
      return Response.json({
        preview: true,
        would_insert: result.would_insert,
        date_from: result.date_from,
        date_to: result.date_to,
        skipped_existing: result.skipped_existing,
        skipped_empty: result.skipped_empty,
        skipped_future: result.skipped_future,
        errors: result.errors,
      });
    }
    return Response.json({
      inserted: 0,
      skipped_existing: result.skipped_existing,
      skipped_empty: result.skipped_empty,
      skipped_future: result.skipped_future,
      errors: result.errors,
      batch_id: null,
      preview: false,
    });
  }

  // Real import — delegate to shared lib
  const supabase = getSupabaseServerClient();
  const result = await importLocationFromSheet(locationId, session.user.userId ?? null, accessToken, supabase);
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ inserted: result.inserted, skipped_existing: result.skipped_existing, skipped_empty: result.skipped_empty, errors: result.errors, batch_id: result.batch_id, preview: false });
}
