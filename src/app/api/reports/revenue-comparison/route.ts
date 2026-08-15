import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { salesNetTotal, type DailyEntry } from "@/modules/accounting/types";

function key(month: number, locationId: string): string {
  return `${month}:${locationId}`;
}

/** Fetch every row of a query, paginating past PostgREST's 1000-row cap. */
async function fetchAllRows<T>(
  query: { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }> },
  batchSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await query.range(from, from + batchSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < batchSize) break;
    from += batchSize;
  }
  return all;
}

/** Revenue per (month, location) from a daily_entries slice. */
function monthRevenueByLocation(entries: DailyEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    const m = new Date(e.entry_date + "T00:00:00Z").getUTCMonth() + 1;
    const k = key(m, e.location_id);
    map.set(k, (map.get(k) ?? 0) + salesNetTotal(e));
  }
  return map;
}

function deltas(current: number, prev: number) {
  return {
    delta: current - prev,
    deltaPct: prev > 0 ? ((current - prev) / prev) * 100 : null,
  };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (!hasModuleAccess(permissions, "reports")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? "", 10) || now.getFullYear();
  const prevYear = year - 1;
  const focusMonth = parseInt(searchParams.get("month") ?? "", 10) || now.getMonth() + 1;
  const locationsParam = searchParams.get("locations") ?? "all";

  const supabase = getSupabaseServerClient();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const prevFrom = `${prevYear}-01-01`;
  const prevTo = `${prevYear}-12-31`;

  const [
    { data: locsData },
    currentEntries,
    prevEntries,
    { data: inputRows },
  ] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("name"),
    fetchAllRows<DailyEntry>(
      supabase
        .from("daily_entries")
        .select("*")
        .eq("organization_id", DEFAULT_ORG_ID)
        .gte("entry_date", from)
        .lte("entry_date", to)
    ),
    fetchAllRows<DailyEntry>(
      supabase
        .from("daily_entries")
        .select("*")
        .eq("organization_id", DEFAULT_ORG_ID)
        .gte("entry_date", prevFrom)
        .lte("entry_date", prevTo)
    ),
    supabase
      .from("monthly_revenue_inputs")
      .select("location_id, month, amount")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("year", prevYear),
  ]);

  const allLocations = (locsData ?? []) as { id: string; name: string }[];
  const selectedIds =
    locationsParam === "all"
      ? allLocations.map((l) => l.id)
      : locationsParam.split(",").filter(Boolean);
  const locations = allLocations.filter((l) => selectedIds.includes(l.id));

  const currentMap = monthRevenueByLocation(currentEntries ?? []);
  const prevAccountingMap = monthRevenueByLocation(prevEntries ?? []);

  // Manual inputs take priority over accounting for the previous year; if a
  // shop/month has no manual input, fall back to daily_entries when available.
  const inputMap = new Map<string, number>();
  for (const r of (inputRows ?? []) as { location_id: string; month: number; amount: number }[]) {
    inputMap.set(key(r.month, r.location_id), Number(r.amount) || 0);
  }

  function prevRevenue(month: number, locationId: string): { amount: number; fromInput: boolean } {
    if (inputMap.has(key(month, locationId))) {
      return { amount: inputMap.get(key(month, locationId)) ?? 0, fromInput: true };
    }
    return { amount: prevAccountingMap.get(key(month, locationId)) ?? 0, fromInput: false };
  }

  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    let current = 0;
    let prev = 0;
    for (const loc of locations) {
      current += currentMap.get(key(month, loc.id)) ?? 0;
      prev += prevRevenue(month, loc.id).amount;
    }
    return { month, current, prev, ...deltas(current, prev) };
  });

  const byShopFocus = locations.map((loc) => {
    const current = currentMap.get(key(focusMonth, loc.id)) ?? 0;
    const prev = prevRevenue(focusMonth, loc.id);
    return {
      locationId: loc.id,
      locationName: loc.name,
      current,
      prev: prev.amount,
      prevFromInput: prev.fromInput,
      ...deltas(current, prev.amount),
    };
  });

  const ytdCurrent = byMonth.slice(0, focusMonth).reduce((s, m) => s + m.current, 0);
  const ytdPrev = byMonth.slice(0, focusMonth).reduce((s, m) => s + m.prev, 0);
  const currentYearTotal = byMonth.reduce((s, m) => s + m.current, 0);
  const prevYearTotal = byMonth.reduce((s, m) => s + m.prev, 0);

  const currentMonth = byMonth[focusMonth - 1];

  const monthsWithPrevData = new Set<number>();
  for (const loc of locations) {
    for (let m = 1; m <= 12; m++) {
      if (prevRevenue(m, loc.id).amount > 0) monthsWithPrevData.add(m);
    }
  }

  return Response.json({
    year,
    prevYear,
    focusMonth,
    locations,
    byMonth,
    byShopFocus,
    inputs: (inputRows ?? []).filter((r) => selectedIds.includes(r.location_id)),
    totals: {
      currentMonth,
      ytd: { current: ytdCurrent, prev: ytdPrev, ...deltas(ytdCurrent, ytdPrev) },
      currentYearTotal,
      prevYearTotal,
    },
    inputStatus: {
      monthsWithPrevData: Array.from(monthsWithPrevData).sort((a, b) => a - b),
    },
    canEdit: permissions.global_role === "owner" || permissions.global_role === "admin",
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (!hasModuleAccess(permissions, "reports")) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (permissions.global_role !== "owner" && permissions.global_role !== "admin") {
    return Response.json({ error: "Owner access required" }, { status: 403 });
  }

  let body: { year?: unknown; rows?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = Number(body.year);
  const rows: { location_id: string; month: number; amount: number }[] = [];
  if (Array.isArray(body.rows)) {
    for (const raw of body.rows) {
      if (!raw || typeof raw !== "object") {
        return Response.json({ error: "Invalid row" }, { status: 400 });
      }
      const row = raw as Record<string, unknown>;
      const locationId = row.location_id;
      const month = row.month;
      const amount = row.amount;
      if (
        typeof locationId !== "string" ||
        typeof month !== "number" ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12 ||
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        return Response.json({ error: "Invalid row" }, { status: 400 });
      }
      rows.push({ location_id: locationId, month, amount });
    }
  }
  if (!Number.isInteger(year) || rows.length === 0) {
    return Response.json({ error: "year and rows are required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const userId = session.user.userId ?? null;
  const now = new Date().toISOString();

  const upserts: {
    organization_id: string;
    location_id: string;
    year: number;
    month: number;
    amount: number;
    created_by: string | null;
    updated_by: string | null;
    updated_at: string;
  }[] = [];
  const deletes: { location_id: string; month: number }[] = [];

  for (const row of rows) {
    if (row.amount > 0) {
      upserts.push({
        organization_id: DEFAULT_ORG_ID,
        location_id: row.location_id,
        year,
        month: row.month,
        amount: row.amount,
        created_by: userId,
        updated_by: userId,
        updated_at: now,
      });
    } else {
      deletes.push({ location_id: row.location_id, month: row.month });
    }
  }

  let error: string | null = null;
  if (upserts.length > 0) {
    const result = await supabase
      .from("monthly_revenue_inputs")
      .upsert(upserts, { onConflict: "organization_id,location_id,year,month" });
    error = result.error?.message ?? null;
  }
  if (!error) {
    for (const d of deletes) {
      const result = await supabase
        .from("monthly_revenue_inputs")
        .delete()
        .eq("organization_id", DEFAULT_ORG_ID)
        .eq("location_id", d.location_id)
        .eq("year", year)
        .eq("month", d.month);
      if (result.error) {
        error = result.error.message;
        break;
      }
    }
  }

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ ok: true, saved: upserts.length, removed: deletes.length });
}
