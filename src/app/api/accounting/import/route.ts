import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { IMPORT_COLUMNS, REQUIRED_IMPORT_HEADERS } from "./columns";

// Handles both dot (1234.56) and comma (1234,56 or 1.234,56) decimal separators,
// strips currency symbols, and treats blank/missing as 0.
function parseNumeric(raw: string): number {
  const s = raw.trim().replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot   = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    // European format: "1.234,56" or "1234,56"
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // Standard format: "1,234.56" or "1234.56"
  return parseFloat(s.replace(/,/g, "")) || 0;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { cells.push(current); current = ""; }
      else { current += ch; }
    }
  }
  cells.push(current);
  return cells;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: "Invalid form data" }, { status: 400 }); }

  const file       = formData.get("file");
  const locationId = formData.get("location_id");

  if (!file || typeof file === "string")
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  if (!locationId || typeof locationId !== "string")
    return Response.json({ error: "location_id is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  // Verify the location belongs to the org
  const { data: loc, error: locErr } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (locErr || !loc)
    return Response.json({ error: "Location not found" }, { status: 400 });

  const text = await (file as File).text();

  // Strip comment lines (lines starting with #) before parsing
  const rawLines = text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"));

  if (rawLines.length < 2)
    return Response.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });

  const headers = parseCsvLine(rawLines[0]).map((h) => h.trim().toLowerCase());

  const missing = REQUIRED_IMPORT_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0)
    return Response.json({ error: `Missing required columns: ${missing.join(", ")}` }, { status: 400 });

  // Build index: csv column name → position in row
  const idx = (name: string) => headers.indexOf(name);

  const errors: string[] = [];
  const toUpsert: object[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const rowNum = i + 1;
    const cells  = parseCsvLine(rawLines[i]);
    const get    = (name: string) => (cells[idx(name)] ?? "").trim();

    const dateVal = get("date");

    // Skip the template hint row (header-format placeholder)
    if (dateVal === "YYYY-MM-DD") continue;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      errors.push(`Row ${rowNum}: invalid date "${dateVal}" — expected YYYY-MM-DD (e.g. 2026-01-15)`);
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
    // notes is optional — include if column present
    const notesIdx = headers.indexOf("notes");
    row["notes"] = notesIdx >= 0 ? (cells[notesIdx] ?? "").trim() || null : null;

    toUpsert.push(row);
  }

  if (errors.length > 0 && toUpsert.length === 0)
    return Response.json({ error: "All rows failed validation", errors }, { status: 422 });

  let inserted = 0;
  if (toUpsert.length > 0) {
    const { data: upserted, error: upsertErr } = await supabase
      .from("daily_entries")
      .upsert(toUpsert, { onConflict: "location_id,entry_date" })
      .select("id");

    if (upsertErr)
      return Response.json({ error: upsertErr.message }, { status: 500 });

    inserted = upserted?.length ?? 0;

    await writeAuditLog({
      userId:     session.user.userId ?? null,
      action:     "accounting.import.bulk",
      moduleKey:  "accounting",
      entityType: "daily_entry",
      entityId:   locationId,
      payload:    { location_id: locationId, location_name: loc.name, row_count: inserted },
    });
  }

  return Response.json({ inserted, errors });
}
