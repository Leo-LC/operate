import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";

function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const isValid = (v: string | null): boolean => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const date = isValid(dateParam) ? dateParam! : bangkokToday();
  const supabase = getSupabaseServerClient();

  try {
    // 1 appel DB parallèle pour shifts + sales + snapshot du jour
    const [shiftsRes, salesRes, snapRes] = await Promise.all([
      (() => {
        let q = supabase.from("loyverse_shifts_raw").select("*").eq("date", date).order("store_id", { ascending: true });
        if (guard.allowedLocationIds !== null) {
          if (guard.allowedLocationIds.length === 0) return Promise.resolve({ data: [], error: null } as unknown as { data: typeof q extends Promise<infer T> ? T : never; error: null });
          q = q.in("location_id", guard.allowedLocationIds);
        }
        return q;
      })(),
      (() => {
        let q = supabase.from("loyverse_daily_sales").select("*").eq("date", date).order("store_id", { ascending: true });
        if (guard.allowedLocationIds !== null) {
          if (guard.allowedLocationIds.length === 0) return Promise.resolve({ data: [], error: null } as unknown as { data: typeof q extends Promise<infer T> ? T : never; error: null });
          q = q.in("location_id", guard.allowedLocationIds);
        }
        return q;
      })(),
      (() => {
        let q = supabase.from("loyverse_daily_snapshots").select("*").eq("date", date).order("store_id", { ascending: true });
        if (guard.allowedLocationIds !== null) {
          if (guard.allowedLocationIds.length === 0) return Promise.resolve({ data: [], error: null } as unknown as { data: typeof q extends Promise<infer T> ? T : never; error: null });
          q = q.in("location_id", guard.allowedLocationIds);
        }
        return q;
      })(),
    ]);

    if (shiftsRes.error) throw shiftsRes.error;
    if (salesRes.error) throw salesRes.error;
    if (snapRes.error) throw snapRes.error;

    const shifts = (shiftsRes.data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id, account_key: r.account_key, store_id: r.store_id, location_id: r.location_id, date: r.date, shifts: (r.shifts as unknown[]) ?? [], shift_count: (r.shift_count as number) ?? 0, fetched_at: r.fetched_at, updated_at: r.updated_at,
    }));
    const sales = (salesRes.data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id, account_key: r.account_key, store_id: r.store_id, location_id: r.location_id, date: r.date, sales_by_category: (r.sales_by_category as unknown[]) ?? [], sales_by_item: (r.sales_by_item as unknown[]) ?? [], receipt_count: (r.receipt_count as number) ?? 0, fetched_at: r.fetched_at, updated_at: r.updated_at,
    }));
    const snapshots = snapRes.data ?? [];

    return NextResponse.json({ date, shifts, sales, snapshots });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
