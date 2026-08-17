import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { REVENUE_THRESHOLDS, normalizeLocationKey } from "@/modules/challenges/constants";
import { loadRevenueThresholdOverrides } from "@/modules/challenges/settings";

function titleCase(key: string): string {
  return key
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const [locationsResult, overrides] = await Promise.all([
    supabase
      .from("locations")
      .select("name")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("name"),
    loadRevenueThresholdOverrides(),
  ]);
  if (locationsResult.error) return Response.json({ error: locationsResult.error.message }, { status: 500 });

  const shops = new Map<string, string>();
  for (const loc of locationsResult.data ?? []) {
    const key = normalizeLocationKey(loc.name as string);
    if (key) shops.set(key, loc.name as string);
  }
  // Keep hardcoded defaults visible even if a shop has no row in locations yet.
  for (const key of Object.keys(REVENUE_THRESHOLDS)) {
    if (!shops.has(key)) shops.set(key, `Capybara Coffee ${titleCase(key)}`);
  }

  const thresholds = Object.fromEntries(
    Array.from(shops.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, name]) => [
        key,
        {
          name,
          value: overrides.get(key) ?? null,
          default: REVENUE_THRESHOLDS[key] ?? null,
        },
      ])
  );

  return Response.json({ thresholds, canManage: session.user.role === "owner" });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { thresholds?: Record<string, number | string | null> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const thresholds = body.thresholds;
  if (!thresholds || typeof thresholds !== "object") {
    return Response.json({ error: "thresholds object required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const updatedBy = session.user.userId ?? null;

  for (const [key, rawValue] of Object.entries(thresholds)) {
    const value = rawValue === null || rawValue === "" ? null : Number(rawValue);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      return Response.json({ error: `Invalid threshold for "${key}"` }, { status: 400 });
    }
    const row = { organization_id: DEFAULT_ORG_ID, location_key: key, updated_by: updatedBy, updated_at: now };
    if (value === null) {
      const result = await supabase
        .from("challenge_settings")
        .delete()
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("location_key", key);
      if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
    } else {
      const result = await supabase
        .from("challenge_settings")
        .upsert({ ...row, revenue_threshold: value }, { onConflict: "organization_id,location_key" });
      if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}