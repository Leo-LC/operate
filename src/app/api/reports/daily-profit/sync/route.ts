import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getOrganizationAccessToken } from "@/lib/google-token";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { IMPORT_COLUMNS } from "@/app/api/accounting/import/columns";
import { parseDate, parseNumeric } from "@/app/api/accounting/import-sheets/lib";
import { getUserPermissionsFromDb } from "@/core/permissions/server";

type MirrorRow = { id: string; location_id: string; entry_date: string; payload: Record<string, unknown>; source_hash: string };

function stableHash(payload: Record<string, unknown>) {
  const sorted = Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)));
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter((key) => before[key] !== after[key]).sort();
}

async function runSync(preview: boolean, userId: string | null) {
  const accessToken = await getOrganizationAccessToken();
  if (!accessToken) return Response.json({ error: "Google account is not connected or its token expired" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id,name,google_sheet_id")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .not("google_sheet_id", "is", null)
    .order("name");
  if (locationsError) return Response.json({ error: locationsError.message }, { status: 500 });

  const results: Array<{ locationId: string; locationName: string; inserted: number; updated: number; unchanged: number; errors: string[] }> = [];
  for (const location of locations ?? []) {
    const result = { locationId: String(location.id), locationName: String(location.name), inserted: 0, updated: 0, unchanged: 0, errors: [] as string[] };
    try {
      const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(String(location.google_sheet_id))}/values/DAILY_ENTRIES`;
      const sheetResponse = await fetch(sheetUrl, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      if (!sheetResponse.ok) throw new Error(`Sheets API ${sheetResponse.status}`);
      const sheet = await sheetResponse.json() as { values?: string[][] };
      const rows = sheet.values ?? [];
      const headerIndex = rows.slice(0, 5).findIndex((row) => row.some((cell) => (cell ?? "").trim().toLowerCase() === "date"));
      if (headerIndex < 0) throw new Error("Date header not found");
      const headers = rows[headerIndex].map((header) => (header ?? "").trim().toLowerCase());
      const index = (name: string) => headers.indexOf(name);
      const parsed: Array<{ entryDate: string; payload: Record<string, unknown>; sourceHash: string }> = [];

      for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
        const cells = rows[rowIndex];
        const rawDate = String(cells[index("date")] ?? "").trim();
        if (!rawDate || rawDate === "YYYY-MM-DD") continue;
        const entryDate = parseDate(rawDate);
        if (!entryDate) { result.errors.push(`Row ${rowIndex + 1}: invalid date ${rawDate}`); continue; }
        const payload: Record<string, unknown> = {};
        for (const column of IMPORT_COLUMNS) {
          if (column.db === "date") continue;
          const cellIndex = index(column.csv);
          payload[column.db] = cellIndex >= 0 ? parseNumeric(String(cells[cellIndex] ?? "")) : 0;
        }
        const notesIndex = index("notes");
        payload.notes = notesIndex >= 0 ? String(cells[notesIndex] ?? "").trim() || null : null;
        const meaningful = Object.entries(payload).some(([key, value]) => key !== "notes" && n(value) !== 0);
        if (!meaningful) continue;
        parsed.push({ entryDate, payload, sourceHash: stableHash(payload) });
      }

      const dates = parsed.map((row) => row.entryDate);
      const existing = new Map<string, MirrorRow>();
      for (let offset = 0; offset < dates.length; offset += 200) {
        const page = dates.slice(offset, offset + 200);
        if (page.length === 0) continue;
        const { data, error } = await supabase.from("finance_sheet_entries").select("id,location_id,entry_date,payload,source_hash")
          .eq("organization_id", DEFAULT_ORG_ID).eq("location_id", location.id).in("entry_date", page);
        if (error) throw error;
        for (const row of data ?? []) existing.set(String(row.entry_date), row as MirrorRow);
      }

      for (const row of parsed) {
        const previous = existing.get(row.entryDate);
        if (previous?.source_hash === row.sourceHash) { result.unchanged += 1; continue; }
        if (previous) result.updated += 1; else result.inserted += 1;
        if (preview) continue;

        const { data: saved, error: saveError } = await supabase.from("finance_sheet_entries").upsert({
          organization_id: DEFAULT_ORG_ID,
          location_id: location.id,
          entry_date: row.entryDate,
          payload: row.payload,
          source_hash: row.sourceHash,
          source_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id,location_id,entry_date" }).select("id").single();
        if (saveError) throw saveError;

        const { error: revisionError } = await supabase.from("finance_sheet_revisions").insert({
          organization_id: DEFAULT_ORG_ID,
          finance_sheet_entry_id: saved.id,
          location_id: location.id,
          entry_date: row.entryDate,
          before_payload: previous?.payload ?? null,
          after_payload: row.payload,
          changed_fields: changedFields(previous?.payload ?? {}, row.payload),
          source_hash: row.sourceHash,
          created_by: userId,
        });
        if (revisionError) throw revisionError;
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : "Unknown sync error");
    }
    results.push(result);
  }

  const summary = {
    preview,
    inserted: results.reduce((sum, result) => sum + result.inserted, 0),
    updated: results.reduce((sum, result) => sum + result.updated, 0),
    unchanged: results.reduce((sum, result) => sum + result.unchanged, 0),
    errors: results.reduce((sum, result) => sum + result.errors.length, 0),
    results,
  };

  if (!preview) {
    await supabase.from("finance_sync_config").upsert({
      organization_id: DEFAULT_ORG_ID,
      last_run_at: new Date().toISOString(),
      last_run_result: summary,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });
    await supabase.from("finance_audit_events").insert({
      organization_id: DEFAULT_ORG_ID,
      user_id: userId,
      action: "finance.sheet_mirror.sync",
      entity_type: "finance_sheet_entries",
      reason: "Manual Daily P&L refresh",
      payload: summary,
    });
  }

  return Response.json(summary);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (permissions.global_role !== "owner") return Response.json({ error: "Owner access required" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { preview?: boolean };
  return runSync(body.preview === true, session.user.userId ?? null);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseServerClient();
  const { data: config, error } = await supabase.from("finance_sync_config").select("enabled").eq("organization_id", DEFAULT_ORG_ID).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!config?.enabled) return Response.json({ skipped: true, reason: "Daily P&L sync disabled" });
  return runSync(false, null);
}

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
