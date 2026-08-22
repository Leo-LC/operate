import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { IMPORT_COLUMNS, REQUIRED_IMPORT_HEADERS } from "@/app/api/accounting/import/columns";

export function parseNumeric(raw: string): number {
  const s = (raw ?? "").trim().replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot   = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(s.replace(/,/g, "")) || 0;
}

const MONTH_MAP: Record<string, string> = {
  jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06",
  jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12",
};

export function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dmy) {
    const m = MONTH_MAP[dmy[2].toLowerCase().slice(0, 3)];
    if (m) return `${dmy[3]}-${m}-${dmy[1].padStart(2, "0")}`;
  }
  const slashDmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDmy) return `${slashDmy[3]}-${slashDmy[2].padStart(2, "0")}-${slashDmy[1].padStart(2, "0")}`;
  const slashYmd = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashYmd) return `${slashYmd[1]}-${slashYmd[2]}-${slashYmd[3]}`;
  const mdy = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdy) {
    const m = MONTH_MAP[mdy[1].toLowerCase().slice(0, 3)];
    if (m) return `${mdy[3]}-${m}-${mdy[2].padStart(2, "0")}`;
  }
  return null;
}

export type ImportLocationResult = {
  location_id: string;
  location_name: string;
  inserted: number;
  skipped_existing: number;
  skipped_empty: number;
  errors: string[];
  batch_id: string | null;
  error?: string;
  // populated in preview mode only
  would_insert?: number;
  date_from?: string;
  date_to?: string;
};

export async function importLocationFromSheet(
  locationId: string,
  userId: string | null,
  accessToken: string,
  supabase: SupabaseClient,
  preview = false,
): Promise<ImportLocationResult> {
  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select("id, name, google_sheet_id, last_imported_at")
    .eq("id", locationId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (locErr || !loc) return { location_id: locationId, location_name: "", inserted: 0, skipped_existing: 0, skipped_empty: 0, errors: [], batch_id: null, error: "Location not found" };
  if (!loc.google_sheet_id) return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: 0, skipped_empty: 0, errors: [], batch_id: null, error: "No Sheet ID configured" };

  const lastImportedAt = loc.last_imported_at;

  const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(loc.google_sheet_id as string)}/values/DAILY_ENTRIES`;
  const sheetRes = await fetch(sheetUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!sheetRes.ok) {
    const msg = sheetRes.status === 403 || sheetRes.status === 401
      ? "Cannot access spreadsheet — check permissions"
      : sheetRes.status === 404
        ? "Tab 'DAILY_ENTRIES' not found"
        : `Sheets API error ${sheetRes.status}`;
    return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: 0, skipped_empty: 0, errors: [], batch_id: null, error: msg };
  }

  const sheetData = (await sheetRes.json()) as { values?: string[][] };
  const rows = sheetData.values ?? [];

  if (rows.length < 2) return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: 0, skipped_empty: 0, errors: [], batch_id: null, error: "Sheet has no data rows" };

  const headerRowIndex = rows.slice(0, 5).findIndex(
    (row) => row.some((cell) => (cell ?? "").trim().toLowerCase() === "date")
  );
  if (headerRowIndex === -1) return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: 0, skipped_empty: 0, errors: [], batch_id: null, error: "Header row with 'date' not found in first 5 rows" };

  const headers = rows[headerRowIndex].map((h) => (h ?? "").trim().toLowerCase());
  const missing = REQUIRED_IMPORT_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: 0, skipped_empty: 0, errors: [], batch_id: null, error: `Missing columns: ${missing.join(", ")}` };

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
      updated_by: userId,
      created_by: userId,
      updated_at: new Date().toISOString(),
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

  if (parsed.length === 0) return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: 0, skipped_empty: skippedEmpty, errors, batch_id: null };

  // Get all unique dates from parsed rows
  const parsedDates = Array.from(new Set(parsed.map((p) => p.dateVal)));

  // Fetch existing entries for these dates to compare values
  const { data: existingEntries } = await supabase
    .from("daily_entries")
    .select("entry_date, " + IMPORT_COLUMNS.map((c) => c.db).join(", ") + ", notes")
    .eq("location_id", locationId)
    .in("entry_date", parsedDates);

  const entries = (existingEntries ?? []) as { entry_date: string }[];
  const existingMap = new Map(
    entries.map((e) => [e.entry_date, e])
  );

  // Filter: keep only new rows or rows where values differ from existing
  let toUpsert = parsed.filter((p) => {
    const existing = existingMap.get(p.dateVal);
    if (!existing) return true; // new date

    // Compare all importable columns
    for (const col of IMPORT_COLUMNS) {
      if (col.db === "date") continue;
      const sheetVal = Number(p.row[col.db] ?? 0);
      const dbVal = Number(existing[col.db] ?? 0);
      if (sheetVal !== dbVal) return true; // value changed
    }
    // Compare notes
    const sheetNotes = p.row.notes as string | null;
    const dbNotes = existing.notes as string | null;
    if (sheetNotes !== dbNotes) return true;

    return false; // unchanged — skip
  });

  // Also respect last_imported_at as a fallback optimization
  if (lastImportedAt) {
    const lastImportedDate = new Date(lastImportedAt).toISOString().split("T")[0];
    toUpsert = toUpsert.filter((p) => p.dateVal > lastImportedDate);
  }

  const skippedExisting = parsed.length - toUpsert.length;

  if (toUpsert.length === 0) return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: skippedExisting, skipped_empty: skippedEmpty, errors, batch_id: null };

  // Preview mode — return what would be imported without writing
  if (preview) {
    const dates = toUpsert.map((p) => p.dateVal).sort();
    return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: skippedExisting, skipped_empty: skippedEmpty, errors, batch_id: null, would_insert: toUpsert.length, date_from: dates[0], date_to: dates[dates.length - 1] };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("daily_entries")
    .upsert(toUpsert.map((p) => p.row), { onConflict: "location_id,entry_date" })
    .select("id");

  if (insertErr) return { location_id: locationId, location_name: loc.name as string, inserted: 0, skipped_existing: skippedExisting, skipped_empty: skippedEmpty, errors, batch_id: null, error: insertErr.message };

  const entryIds = (inserted ?? []).map((r) => r.id as string);

  const { data: batch } = await supabase
    .from("sheet_import_batches")
    .insert({ organization_id: DEFAULT_ORG_ID, location_id: locationId, imported_by: userId, row_count: entryIds.length, entry_ids: entryIds })
    .select("id")
    .single();

  await supabase
    .from("locations")
    .update({ last_imported_at: new Date().toISOString() })
    .eq("id", locationId);

  await writeAuditLog({
    userId,
    action: "accounting.sheets.import",
    moduleKey: "accounting",
    entityType: "daily_entry",
    entityId: locationId,
    payload: { location_id: locationId, location_name: loc.name, row_count: entryIds.length, batch_id: batch?.id ?? null },
  });

  return { location_id: locationId, location_name: loc.name as string, inserted: entryIds.length, skipped_existing: skippedExisting, skipped_empty: skippedEmpty, errors, batch_id: batch?.id ?? null };
}
