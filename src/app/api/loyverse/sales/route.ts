import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";

function bangkokDate(offsetDays = 0): string {
  const ms = Date.now() + 7 * 60 * 60 * 1000 + offsetDays * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const daysParam = url.searchParams.get("days");
  const isValidDate = (v: string | null): boolean => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

  let from: string;
  let to: string;
  if (isValidDate(fromParam) && isValidDate(toParam)) {
    from = fromParam!;
    to = toParam!;
  } else if (isValidDate(dateParam) && daysParam) {
    const days = Math.min(30, Math.max(1, Number(daysParam)));
    const end = new Date(dateParam! + "T00:00:00Z");
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - (days - 1));
    from = start.toISOString().slice(0, 10);
    to = dateParam!;
  } else if (isValidDate(dateParam)) {
    from = dateParam!;
    to = dateParam!;
  } else {
    const d = bangkokDate(-1);
    from = d;
    to = d;
  }

  const supabase = getSupabaseServerClient();

  try {
    let query = supabase
      .from("loyverse_daily_sales")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false })
      .order("store_id", { ascending: true })
      .limit(1000);

    if (guard.allowedLocationIds !== null) {
      if (guard.allowedLocationIds.length === 0) {
        return NextResponse.json({ from, to, rows: [] });
      }
      query = query.in("location_id", guard.allowedLocationIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((r) => ({
      id: r.id,
      account_key: r.account_key,
      store_id: r.store_id,
      location_id: r.location_id,
      date: r.date,
      sales_by_category: r.sales_by_category ?? [],
      sales_by_item: r.sales_by_item ?? [],
      receipt_count: r.receipt_count ?? 0,
      fetched_at: r.fetched_at,
      updated_at: r.updated_at,
    }));

    const singleDate = from === to ? from : undefined;
    return NextResponse.json({ from, to, date: singleDate ?? to, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
