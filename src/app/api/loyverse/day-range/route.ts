import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 31;

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "from and to must be YYYY-MM-DD" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
  }
  if (to > bangkokToday()) {
    return NextResponse.json({ error: "to cannot be in the future" }, { status: 400 });
  }
  const dayCount =
    Math.round(
      (new Date(to + "T00:00:00Z").getTime() - new Date(from + "T00:00:00Z").getTime()) / 86400000,
    ) + 1;
  if (dayCount > MAX_DAYS) {
    return NextResponse.json({ error: `Range too large (max ${MAX_DAYS} days)` }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  try {
    const applyScope = <T>(q: T): T => {
      if (guard.allowedLocationIds === null) return q;
      if (guard.allowedLocationIds.length === 0) {
        // Return an empty-result equivalent: force impossible filter
        return (q as unknown as { in: (c: string, v: string[]) => T }).in("location_id", [
          "00000000-0000-0000-0000-000000000000",
        ]);
      }
      return (q as unknown as { in: (c: string, v: string[]) => T }).in(
        "location_id",
        guard.allowedLocationIds,
      );
    };

    const [shiftsRes, salesRes, snapRes] = await Promise.all([
      applyScope(
        supabase
          .from("loyverse_shifts_raw")
          .select("*")
          .gte("date", from)
          .lte("date", to)
          .order("date", { ascending: true })
          .order("store_id", { ascending: true }),
      ),
      applyScope(
        supabase
          .from("loyverse_daily_sales")
          .select("*")
          .gte("date", from)
          .lte("date", to)
          .order("date", { ascending: true })
          .order("store_id", { ascending: true }),
      ),
      applyScope(
        supabase
          .from("loyverse_daily_snapshots")
          .select("*")
          .gte("date", from)
          .lte("date", to)
          .order("date", { ascending: true })
          .order("store_id", { ascending: true }),
      ),
    ]);

    if (shiftsRes.error) throw shiftsRes.error;
    if (salesRes.error) throw salesRes.error;
    if (snapRes.error) throw snapRes.error;

    const shifts = (shiftsRes.data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      account_key: r.account_key,
      store_id: r.store_id,
      location_id: r.location_id,
      date: r.date,
      shifts: (r.shifts as unknown[]) ?? [],
      shift_count: (r.shift_count as number) ?? 0,
      fetched_at: r.fetched_at,
      updated_at: r.updated_at,
    }));
    const sales = (salesRes.data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      account_key: r.account_key,
      store_id: r.store_id,
      location_id: r.location_id,
      date: r.date,
      sales_by_category: (r.sales_by_category as unknown[]) ?? [],
      sales_by_item: (r.sales_by_item as unknown[]) ?? [],
      receipt_count: (r.receipt_count as number) ?? 0,
      fetched_at: r.fetched_at,
      updated_at: r.updated_at,
    }));
    const snapshots = snapRes.data ?? [];

    return NextResponse.json({ from, to, shifts, sales, snapshots });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
