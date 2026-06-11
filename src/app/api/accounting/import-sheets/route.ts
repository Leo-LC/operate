import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { IMPORT_COLUMNS, REQUIRED_IMPORT_HEADERS } from "@/app/api/accounting/import/columns";

function parseNumeric(raw: string): number {
  const s = (raw ?? "").trim().replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot   = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(s.replace(/,/g, "")) || 0;
}

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

  let body: { location_id?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { location_id: locationId } = body;
  if (!locationId) return Response.json({ error: "location_id is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select("id, name, google_sheet_id")
    .eq("id", locationId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (locErr || !loc) return Response.json({ error: "Location not found" }, { status: 400 });
  if (!loc.google_sheet_id) return Response.json({ error: "No Google Sheet ID configured for this location. Go to Admin → Locations to add it." }, { status: 400 });

  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) return Response.json({ error: "Google account not connected or token expired. Please sign out and back in." }, { status: 400 });

  // Fetch the sheet data from Google Sheets API
  const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(loc.google_sheet_id as string)}/values/DAILY_ENTRIES`;
  const sheetRes = await fetch(sheetUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!sheetRes.ok) {
    const errText = await sheetRes.text();
    if (sheetRes.status === 403 || sheetRes.status === 401) {
      return Response.json({ error: "Cannot access the spreadsheet. Make sure the Google account has access, then sign out and back in to grant the spreadsheets permission." }, { status: 400 });
    }
    if (sheetRes.status === 404) {
      return Response.json({ error: "Spreadsheet or tab 'DAILY_ENTRIES' not found. Check the Sheet ID in Admin → Locations." }, { status: 400 });
    }
    return Response.json({ error: `Google Sheets API error: ${sheetRes.status} — ${errText}` }, { status: 500 });
  }

  const sheetData = (await sheetRes.json()) as { values?: string[][] };
  const rows = sheetData.values ?? [];

  if (rows.length < 2) return Response.json({ error: "Sheet has no data rows (need at least a header row and one data row)." }, { status: 400 });

  const headers = rows[0].map((h) => (h ?? "").trim().toLowerCase());

  const missing = REQUIRED_IMPORT_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return Response.json({ error: `Sheet is missing required columns: ${missing.join(", ")}` }, { status: 400 });
  }

  const idx = (name: string) => headers.indexOf(name);

  // Parse all data rows, collecting valid dates
  const errors: string[] = [];
  type ParsedRow = { dateVal: string; row: Record<string, unknown> };
  const parsed: ParsedRow[] = [];
  let skippedEmpty = 0;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const get = (name: string) => ((cells[idx(name)] ?? "") as string).trim();
    const dateVal = get("date");

    if (!dateVal) { skippedEmpty++; continue; }
    if (dateVal === "YYYY-MM-DD") { skippedEmpty++; continue; }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      errors.push(`Row ${i + 1}: invalid date "${dateVal}" — expected YYYY-MM-DD`);
      continue;
    }

    const row: Record<string, unknown> = {
      organization_id: DEFAULT_ORG_ID,
      location_id:     locationId,
      entry_date:      dateVal,
      updated_by:      session.user.userId ?? null,
      created_by:      session.user.userId ?? null,
      updated_at:      new Date().toISOString(),
    };

    for (const col of IMPORT_COLUMNS) {
      if (col.db === "date") continue;
      row[col.db] = parseNumeric(get(col.csv));
    }
    const notesIdx = idx("notes");
    row["notes"] = notesIdx >= 0 ? (cells[notesIdx] ?? "").toString().trim() || null : null;

    parsed.push({ dateVal, row });
  }

  if (parsed.length === 0 && errors.length === 0) {
    return Response.json({ inserted: 0, skipped_existing: 0, skipped_empty: skippedEmpty, errors, batch_id: null });
  }

  // Check which dates already exist in the DB — skip those
  const allDates = parsed.map((p) => p.dateVal);
  const { data: existing } = await supabase
    .from("daily_entries")
    .select("entry_date")
    .eq("location_id", locationId)
    .in("entry_date", allDates);

  const existingDates = new Set((existing ?? []).map((e) => e.entry_date as string));
  const toInsert = parsed.filter((p) => !existingDates.has(p.dateVal));
  const skippedExisting = parsed.length - toInsert.length;

  if (toInsert.length === 0) {
    return Response.json({ inserted: 0, skipped_existing: skippedExisting, skipped_empty: skippedEmpty, errors, batch_id: null });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("daily_entries")
    .insert(toInsert.map((p) => p.row))
    .select("id");

  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  const entryIds = (inserted ?? []).map((r) => r.id as string);

  const { data: batch, error: batchErr } = await supabase
    .from("sheet_import_batches")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      location_id:     locationId,
      imported_by:     session.user.userId ?? null,
      row_count:       entryIds.length,
      entry_ids:       entryIds,
    })
    .select("id")
    .single();

  if (batchErr) return Response.json({ error: batchErr.message }, { status: 500 });

  await writeAuditLog({
    userId:     session.user.userId ?? null,
    action:     "accounting.sheets.import",
    moduleKey:  "accounting",
    entityType: "daily_entry",
    entityId:   locationId,
    payload:    { location_id: locationId, location_name: loc.name, row_count: entryIds.length, batch_id: batch.id },
  });

  return Response.json({ inserted: entryIds.length, skipped_existing: skippedExisting, skipped_empty: skippedEmpty, errors, batch_id: batch.id });
}
