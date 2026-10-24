import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireLoyverseAccess } from "@/modules/loyverse/lib/guard";
import { aggregateItemSales, aggregatePrices, dayCountInclusive, type RawSalesRow } from "@/modules/loyverse/lib/item-analysis";

const MAX_SPAN_DAYS = 400;

function isValidDate(v: string | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * GET /api/loyverse/item-sales?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Lit loyverse_daily_sales (agrégats signés, déjà nettoyés par le sync) et
 * renvoie la liste dédupliquée des articles + leur série journalière sur la
 * plage. L'agrégation est faite ici pour que le client ne télécharge qu'une
 * réponse bornée, pas les JSONB bruts de toutes les lignes.
 */
export async function GET(request: Request) {
  const guard = await requireLoyverseAccess();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  if (!isValidDate(fromParam) || !isValidDate(toParam)) {
    return NextResponse.json({ error: "from and to (YYYY-MM-DD) are required" }, { status: 400 });
  }
  const from = fromParam!;
  const to = toParam!;
  if (from > to) {
    return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
  }
  if (dayCountInclusive(from, to) > MAX_SPAN_DAYS) {
    return NextResponse.json({ error: `range is limited to ${MAX_SPAN_DAYS} days` }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  try {
    let query = supabase
      .from("loyverse_daily_sales")
      .select("location_id, date, sales_by_item, prices_by_item")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true })
      .limit(5000);

    if (guard.allowedLocationIds !== null) {
      if (guard.allowedLocationIds.length === 0) {
        return NextResponse.json({ from, to, items: [], series: {}, dates: [], days_with_rows: [], prices: {}, locations: {} });
      }
      query = query.in("location_id", guard.allowedLocationIds);
    }

    const [{ data: rows, error }, { data: locations, error: locError }] = await Promise.all([
      query,
      supabase.from("locations").select("id, name"),
    ]);
    if (error) throw error;
    if (locError) throw locError;

    const locationMap: Record<string, string> = {};
    for (const l of locations ?? []) locationMap[(l as { id: string }).id] = (l as { id: string; name: string }).name;

    const result = aggregateItemSales((rows ?? []) as unknown as RawSalesRow[], from, to);
    const prices = aggregatePrices((rows ?? []) as unknown as RawSalesRow[]);

    return NextResponse.json({ from, to, ...result, prices, locations: locationMap });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
