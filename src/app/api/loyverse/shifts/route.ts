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
  // Défaut: veille Bangkok
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : bangkokDate(-1);

  const supabase = getSupabaseServerClient();

  try {
    let query = supabase
      .from("loyverse_shifts_raw")
      .select("*")
      .eq("date", date)
      .order("store_id", { ascending: true });

    if (guard.allowedLocationIds !== null) {
      if (guard.allowedLocationIds.length === 0) {
        return NextResponse.json({ date, rows: [] });
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
      shifts: r.shifts ?? [],
      shift_count: r.shift_count ?? (Array.isArray(r.shifts) ? r.shifts.length : 0),
      fetched_at: r.fetched_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ date, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
