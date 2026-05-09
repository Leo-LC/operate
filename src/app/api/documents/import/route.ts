import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { computeStatus } from "@/modules/documents/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

const REQUIRED_HEADERS = [
  "location_name", "title", "code", "thai_form_name", "category",
  "document_type", "authority", "frequency", "is_relevant", "has_document",
  "issued_at", "expires_at", "notes", "shop_notes", "drive_url",
];

const VALID_TYPES = new Set([
  "permit", "license", "certificate", "contract", "insurance", "health", "legal", "hr", "other",
]);

function parseBool(v: string, defaultVal: boolean): boolean {
  const s = v.trim().toLowerCase();
  if (s === "yes" || s === "true" || s === "1") return true;
  if (s === "no" || s === "false" || s === "0") return false;
  return defaultVal;
}

function parseDate(v: string): string | null {
  if (!v.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return undefined as unknown as null;
  return v.trim();
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
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "documents")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await (file as File).text();
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim());
  if (rawLines.length < 2) {
    return Response.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
  }

  const headers = parseCsvLine(rawLines[0]).map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return Response.json({
      error: `Missing required columns: ${missing.join(", ")}`,
    }, { status: 400 });
  }

  const idx = (name: string) => headers.indexOf(name);

  const supabase = getSupabaseServerClient();
  const { data: locData, error: locErr } = await supabase
    .from("locations")
    .select("id, name")
    .eq("organization_id", ORG_ID)
    .eq("is_active", true);

  if (locErr) return Response.json({ error: locErr.message }, { status: 500 });

  const locationsByName = new Map<string, string>(
    (locData ?? []).map((l) => [l.name.toLowerCase(), l.id]),
  );

  const errors: string[] = [];
  const toInsert: object[] = [];

  // Skip the instructions row if it matches the known instructions pattern
  const dataLines = rawLines.slice(1).filter((line) => {
    const cells = parseCsvLine(line);
    const titleCell = cells[idx("title")]?.trim() ?? "";
    return titleCell !== "Required";
  });

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2;
    const cells = parseCsvLine(dataLines[i]);
    const get = (name: string) => (cells[idx(name)] ?? "").trim();

    const locationName = get("location_name");
    const title = get("title");

    if (!title) { errors.push(`Row ${rowNum}: title is required`); continue; }

    const locationId = locationsByName.get(locationName.toLowerCase());
    if (!locationId) {
      errors.push(`Row ${rowNum}: location "${locationName}" not found`);
      continue;
    }

    const documentType = get("document_type") || "other";
    if (!VALID_TYPES.has(documentType)) {
      errors.push(`Row ${rowNum}: invalid document_type "${documentType}"`);
      continue;
    }

    const issuedAt = parseDate(get("issued_at"));
    const expiresAt = parseDate(get("expires_at"));

    if (issuedAt === undefined) {
      errors.push(`Row ${rowNum}: issued_at must be YYYY-MM-DD or blank`);
      continue;
    }
    if (expiresAt === undefined) {
      errors.push(`Row ${rowNum}: expires_at must be YYYY-MM-DD or blank`);
      continue;
    }

    const is_relevant = parseBool(get("is_relevant"), true);
    const has_document = parseBool(get("has_document"), false);
    const code = get("code") || null;

    const status = computeStatus({ is_relevant, has_document, expires_at: expiresAt });

    toInsert.push({
      organization_id: ORG_ID,
      location_id: locationId,
      title,
      code,
      thai_form_name: get("thai_form_name") || null,
      category: get("category") || null,
      document_type: documentType,
      authority: get("authority") || null,
      frequency: get("frequency") || null,
      is_relevant,
      has_document,
      issued_at: issuedAt,
      expires_at: expiresAt,
      notes: get("notes") || null,
      shop_notes: get("shop_notes") || null,
      drive_url: get("drive_url") || null,
      status,
      created_by: session.user.userId ?? null,
    });
  }

  if (errors.length > 0 && toInsert.length === 0) {
    return Response.json({ error: "All rows failed validation", errors }, { status: 422 });
  }

  let inserted = 0;
  let skipped = 0;

  if (toInsert.length > 0) {
    const { data: insertedData, error: insertErr } = await supabase
      .from("documents")
      .upsert(toInsert, { onConflict: "location_id,code", ignoreDuplicates: true })
      .select("id");

    if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });
    inserted = insertedData?.length ?? 0;
    skipped = toInsert.length - inserted;
  }

  return Response.json({ inserted, skipped, errors });
}
