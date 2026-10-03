import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import {
  isDisplayOverrideKey,
  type DisplayOverrideKey,
  type DisplayOverrideRow,
} from "@/modules/challenges/lib/display-overrides";

type LocationRow = { id: string; external_id: string | null };

async function canonicalMaps(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data } = await supabase
    .from("locations")
    .select("id, external_id")
    .eq("organization_id", DEFAULT_ORG_ID);
  const uuidToCanonical = new Map<string, string>();
  const canonicalToUuid = new Map<string, string>();
  for (const loc of ((data ?? []) as LocationRow[])) {
    const canonical = loc.external_id ?? loc.id;
    uuidToCanonical.set(loc.id, canonical);
    canonicalToUuid.set(canonical, loc.id);
    // Allow lookup by raw UUID too.
    canonicalToUuid.set(loc.id, loc.id);
  }
  return { uuidToCanonical, canonicalToUuid };
}

function toDisplayValue(metricKey: DisplayOverrideKey, value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

/**
 * GET /api/challenges/overrides?month=YYYY-MM
 * Display overrides for the month, keyed by canonical location id
 * (same id as LocationOverview.locationId, so the client can overlay directly).
 * Read-only — any signed-in user (team view shows adjusted values too).
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "month parameter required in YYYY-MM format" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { uuidToCanonical } = await canonicalMaps(supabase);
  const { data, error } = await supabase
    .from("challenge_display_overrides")
    .select("location_id, metric_key, display_value")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("month", month);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = ((data ?? []) as DisplayOverrideRow[]).map((r) => ({
    location_id: uuidToCanonical.get(r.location_id) ?? r.location_id,
    metric_key: r.metric_key,
    display_value: Number(r.display_value),
  }));
  return Response.json({ overrides: rows });
}

interface PutBody {
  locationId: string; // canonical id (LocationOverview.locationId) or UUID
  month: string; // YYYY-MM
  metricKey: string;
  displayValue: number;
}

/**
 * PUT /api/challenges/overrides — owner only, audit-logged.
 * Upserts ONE metric display override (display-only, sources untouched).
 */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden — display adjust reserved to owner." }, { status: 403 });
  }

  const body = (await request.json()) as PutBody;
  const { locationId, month, metricKey, displayValue } = body;
  if (!locationId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!isDisplayOverrideKey(metricKey)) {
    return Response.json({ error: `Invalid metricKey ${metricKey}` }, { status: 400 });
  }
  const value = toDisplayValue(metricKey, displayValue);
  if (value === null || value < 0) {
    return Response.json({ error: "Invalid displayValue" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { canonicalToUuid } = await canonicalMaps(supabase);
  const uuid = canonicalToUuid.get(locationId);
  if (!uuid) return Response.json({ error: "Unknown location" }, { status: 400 });

  const { error } = await supabase.from("challenge_display_overrides").upsert(
    {
      organization_id: DEFAULT_ORG_ID,
      location_id: uuid,
      month,
      metric_key: metricKey,
      display_value: value,
      created_by: session.user.userId ?? null,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "organization_id,location_id,month,metric_key" },
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "challenges.display.override",
    moduleKey: "challenges",
    entityType: "challenge_display_overrides",
    entityId: uuid,
    payload: { location_id: uuid, month, metric_key: metricKey, display_value: value },
  });
  return Response.json({ ok: true });
}

interface DeleteBody {
  locationId: string;
  month: string; // YYYY-MM
  metricKey?: string; // omit → revert ALL overrides for the shop+month
}

/**
 * DELETE /api/challenges/overrides — owner only, audit-logged.
 * Reverts to the REAL computed value (row deletion, sources untouched).
 */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden — display adjust reserved to owner." }, { status: 403 });
  }

  const body = (await request.json()) as DeleteBody;
  const { locationId, month, metricKey } = body;
  if (!locationId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (metricKey !== undefined && !isDisplayOverrideKey(metricKey)) {
    return Response.json({ error: `Invalid metricKey ${metricKey}` }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { canonicalToUuid } = await canonicalMaps(supabase);
  const uuid = canonicalToUuid.get(locationId);
  if (!uuid) return Response.json({ error: "Unknown location" }, { status: 400 });

  let query = supabase
    .from("challenge_display_overrides")
    .delete()
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("location_id", uuid)
    .eq("month", month);
  if (metricKey) query = query.eq("metric_key", metricKey);
  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "challenges.display.revert",
    moduleKey: "challenges",
    entityType: "challenge_display_overrides",
    entityId: uuid,
    payload: { location_id: uuid, month, metric_key: metricKey ?? "all" },
  });
  return Response.json({ ok: true });
}
