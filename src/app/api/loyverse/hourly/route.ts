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
  const storeId = url.searchParams.get("store_id");
  const accountKey = url.searchParams.get("account_key");

  if (!date || !storeId) return Response.json({ error: "date and store_id required" }, { status: 400 });

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
    const range = dateRangeForDay(date);
    const receipts = await loyverseFetchAll<LoyverseReceipt>(account, "/receipts", "receipts", {
      store_id: storeId,
      created_at_min: range.created_at_min,
      created_at_max: range.created_at_max,
    });

    // Bucket by hour (Bangkok hour) — shops open 9am–9pm
    const OPEN_FROM = 9;
    const OPEN_TO = 21;
    const byHour = new Map<number, { revenue: number; count: number }>();
    for (let h = OPEN_FROM; h <= OPEN_TO; h++) byHour.set(h, { revenue: 0, count: 0 });

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

    const hourly = Array.from(byHour.entries()).map(([hour, v]) => ({ hour, revenue: v.revenue, count: v.count }));
    return Response.json({ date, store_id: storeId, hourly });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
