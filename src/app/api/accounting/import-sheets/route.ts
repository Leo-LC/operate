import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { parseDate, parseNumeric, importLocationFromSheet } from "./lib";
import { REQUIRED_IMPORT_HEADERS, IMPORT_COLUMNS } from "@/app/api/accounting/import/columns";

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

  // Preview mode — parse sheet without writing, compare with existing DB entries
  if (preview) {
    const supabase = getSupabaseServerClient();
    const { data: loc } = await supabase.from("locations").select("id, name, google_sheet_id").eq("id", locationId).eq("organization_id", DEFAULT_ORG_ID).single();
    if (!loc) return Response.json({ error: "Location not found" }, { status: 400 });
    if (!loc.google_sheet_id) return Response.json({ error: "No Google Sheet ID configured for this location." }, { status: 400 });

    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(loc.google_sheet_id as string)}/values/DAILY_ENTRIES`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!sheetRes.ok) {
      if (sheetRes.status === 403 || sheetRes.status === 401) return Response.json({ error: "Cannot access the spreadsheet. Make sure the Google account has access, then sign out and back in to grant the spreadsheets permission." }, { status: 400 });
      if (sheetRes.status === 404) return Response.json({ error: "Spreadsheet or tab 'DAILY_ENTRIES' not found. Check the Sheet ID in Admin → Locations." }, { status: 400 });
      return Response.json({ error: `Google Sheets API error: ${sheetRes.status}` }, { status: 500 });
    }

    const rows = ((await sheetRes.json()) as { values?: string[][] }).values ?? [];
    if (rows.length < 2) return Response.json({ error: "Sheet has no data rows." }, { status: 400 });
    const headerRowIndex = rows.slice(0, 5).findIndex((row) => row.some((cell) => (cell ?? "").trim().toLowerCase() === "date"));
    if (headerRowIndex === -1) return Response.json({ error: "Header row with 'date' not found." }, { status: 400 });
    const headers = rows[headerRowIndex].map((h) => (h ?? "").trim().toLowerCase());
    const missing = REQUIRED_IMPORT_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length > 0) return Response.json({ error: `Sheet is missing required columns: ${missing.join(", ")}` }, { status: 400 });

    const idx = (name: string) => headers.indexOf(name);
    const errors: string[] = [];
    type ParsedRow = { dateVal: string; row: Record<string, unknown> };
    const parsed: ParsedRow[] = [];
    let skippedEmpty = 0;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const cells = rows[i];
      const get = (name: string) => ((cells[idx(name)] ?? "") as string).trim();
      const rawDate = get("date");
      if (!rawDate || rawDate === "YYYY-MM-DD") { skippedEmpty++; continue; }
      const dateVal = parseDate(rawDate);
      if (!dateVal) { errors.push(`Row ${i + 1}: unrecognised date "${rawDate}"`); continue; }

      const row: Record<string, unknown> = {
        organization_id: DEFAULT_ORG_ID,
        location_id: locationId,
        entry_date: dateVal,
      };
      for (const col of IMPORT_COLUMNS) {
        if (col.db === "date") continue;
        row[col.db] = parseNumeric(get(col.csv));
      }
      const notesIdx = idx("notes");
      row["notes"] = notesIdx >= 0 ? (cells[notesIdx] ?? "").toString().trim() || null : null;
      const meaningful = IMPORT_COLUMNS.some((col) => col.db !== "date" && Number(row[col.db] ?? 0) !== 0);
      if (!meaningful) { skippedEmpty++; continue; }
      parsed.push({ dateVal, row });
    }

    if (parsed.length === 0) return Response.json({ inserted: 0, skipped_existing: 0, skipped_empty: skippedEmpty, errors, batch_id: null, preview: false });

    // Fetch existing entries for comparison
    const parsedDates = Array.from(new Set(parsed.map((p) => p.dateVal)));
    const { data: existingEntries } = await supabase
      .from("daily_entries")
      .select("entry_date, " + IMPORT_COLUMNS.map((c) => c.db).join(", ") + ", notes")
      .eq("location_id", locationId)
      .in("entry_date", parsedDates);

    const entries = (existingEntries ?? []) as { entry_date: string }[];
    const existingMap = new Map(
      entries.map((e) => [e.entry_date, e])
    );

    // Filter: keep only new rows or rows where values differ
    const toImport = parsed.filter((p) => {
      const existing = existingMap.get(p.dateVal);
      if (!existing) return true;
      for (const col of IMPORT_COLUMNS) {
        if (col.db === "date") continue;
        const sheetVal = Number(p.row[col.db] ?? 0);
        const dbVal = Number(existing[col.db] ?? 0);
        if (sheetVal !== dbVal) return true;
      }
      const sheetNotes = p.row.notes as string | null;
      const dbNotes = existing.notes as string | null;
      if (sheetNotes !== dbNotes) return true;
      return false;
    });

    const skippedExisting = parsed.length - toImport.length;

    if (toImport.length === 0) return Response.json({ inserted: 0, skipped_existing: skippedExisting, skipped_empty: skippedEmpty, errors, batch_id: null, preview: false });

    const dates = toImport.map((p) => p.dateVal).sort();
    return Response.json({ preview: true, would_insert: toImport.length, date_from: dates[0], date_to: dates[dates.length - 1], skipped_existing: skippedExisting, skipped_empty: skippedEmpty, errors });
  }

  // Real import — delegate to shared lib
  const supabase = getSupabaseServerClient();
  const result = await importLocationFromSheet(locationId, session.user.userId ?? null, accessToken, supabase);
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ inserted: result.inserted, skipped_existing: result.skipped_existing, skipped_empty: result.skipped_empty, errors: result.errors, batch_id: result.batch_id, preview: false });
}
