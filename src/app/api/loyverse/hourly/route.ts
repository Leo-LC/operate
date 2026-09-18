import { getAccounts } from "@/lib/loyverse/accounts";
import { isLoyverseConfigured } from "@/lib/loyverse/client";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";
import { loyverseFetchAll } from "@/lib/loyverse/client";
import { dateRangeForDay } from "@/modules/loyverse-sandbox/lib/aggregate-receipts";
import type { LoyverseReceipt } from "@/modules/loyverse-sandbox/types";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;
  if (!isLoyverseConfigured()) return Response.json({ error: "Not configured" }, { status: 503 });

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const storeId = url.searchParams.get("store_id");
  const accountKey = url.searchParams.get("account_key");

  // Legacy single-day: ?date=YYYY-MM-DD — ou plage: ?from=..&to=..
  let dates: string[];
  if (fromParam || toParam) {
    const from = fromParam ?? toParam!;
    const to = toParam ?? fromParam!;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return Response.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
    }
    if (from > to) return Response.json({ error: "from must be <= to" }, { status: 400 });
    dates = [];
    const cur = new Date(from + "T00:00:00Z");
    const endD = new Date(to + "T00:00:00Z");
    while (cur <= endD && dates.length < 31) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (date) {
    dates = [date];
  } else {
    return Response.json({ error: "date or from/to required" }, { status: 400 });
  }

  if (!storeId) return Response.json({ error: "store_id required" }, { status: 400 });

  // Enforce location scope: restricted users can only query their assigned shops
  if (guard.allowedLocationIds !== null) {
    if (guard.allowedLocationIds.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    // Resolve location_id for the requested store_id and check access
    const supabase = getSupabaseServerClient();
    const { data: locRow } = await supabase
      .from("locations")
      .select("id")
      .eq("loyverse_store_id", storeId)
      .maybeSingle();
    const locationId = (locRow?.id as string | undefined) ?? null;
    // If no mapping exists, only owners/all-access should see it
    if (!locationId || !guard.allowedLocationIds.includes(locationId)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const accounts = getAccounts();
  const account = accountKey ? accounts.find((a) => a.key === accountKey) : accounts[0];
  if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

  try {
    // Bucket by hour (Bangkok hour) — shops open 9am–9pm.
    // Sur plage: on cumule tous les jours (le client divise par le nb de jours pour la moyenne).
    const OPEN_FROM = 9;
    const OPEN_TO = 21;
    const byHour = new Map<number, { revenue: number; count: number }>();
    for (let h = OPEN_FROM; h <= OPEN_TO; h++) byHour.set(h, { revenue: 0, count: 0 });

    for (const day of dates) {
      const range = dateRangeForDay(day);
      const receipts = await loyverseFetchAll<LoyverseReceipt>(account, "/receipts", "receipts", {
        store_id: storeId,
        created_at_min: range.created_at_min,
        created_at_max: range.created_at_max,
      });

      for (const r of receipts) {
        if (r.cancelled_at) continue;
        const raw = r.receipt_date ?? r.created_at ?? "";
        if (!raw) continue;
        // Parse receipt date as ISO, convert to Bangkok hour
        const d = new Date(raw);
        if (isNaN(d.getTime())) continue;
        // Convert to Bangkok hour: UTC +7
        const bangkokHour = (d.getUTCHours() + 7) % 24;
        if (bangkokHour < OPEN_FROM || bangkokHour > OPEN_TO) continue;
        const total = (r as unknown as { total_money?: number }).total_money ?? 0;
        const entry = byHour.get(bangkokHour);
        if (!entry) continue;
        entry.revenue += total;
        entry.count += 1;
      }
    }

    const hourly = Array.from(byHour.entries()).map(([hour, v]) => ({ hour, revenue: v.revenue, count: v.count }));
    return Response.json({ date: dates.length === 1 ? dates[0] : undefined, from: dates[0], to: dates[dates.length - 1], days: dates.length, store_id: storeId, hourly });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
