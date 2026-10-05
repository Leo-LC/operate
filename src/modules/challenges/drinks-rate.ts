import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import {
  normalizeItemName,
  resolveSalesBucket,
  resolveSalesBucketForSamui,
} from "@/modules/loyverse-sandbox/mapping-config";

export interface DrinksRatePeriod {
  drinks: number;
  adults: number;
  rate: number | null;
}

export interface DrinksRateRow {
  locationId: string;
  locationTitle: string;
  p1: DrinksRatePeriod;
  p2: DrinksRatePeriod;
  p3: DrinksRatePeriod;
  total: DrinksRatePeriod;
}

function finalize(drinks: number, adults: number): DrinksRatePeriod {
  return { drinks, adults, rate: adults > 0 ? drinks / adults : null };
}

function periodForDay(day: number): 1 | 2 | 3 {
  if (day <= 10) return 1;
  if (day <= 20) return 2;
  return 3;
}

interface SalesItem {
  item_id?: string | null;
  item_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  quantity?: number | null;
}

function shortName(title: string): string {
  return title.replace(/^Capybara Coffee\s*/i, "").trim() || title;
}

/**
 * Taux de vente boissons expérimental : quantité de boissons / entrées adultes,
 * par shop et par période P1 (1-10) / P2 (11-20) / P3 (21-fin).
 *
 * Source : `loyverse_daily_sales.sales_by_item` (quantités Loyverse par jour/store,
 * remboursements déjà signés négatifs). Aucune nouvelle colonne, aucun resync.
 *
 * Adultes = "vrais adultes uniquement" :
 * - Samui (ou ligne contenant des marqueurs adult/child) : quantité de "A ENTRY adult" seul.
 * - Autres shops : quantité des items bucket `ticket` (= adultes, pas de distinction enfant).
 * Boissons : quantité des items bucket `drinks` (règles Samui dédiées si Samui).
 */
export async function getDrinksRate(month: string): Promise<DrinksRateRow[]> {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error(`Invalid month ${month} — expected YYYY-MM`);
  const [year, monthNum] = month.split("-").map(Number);
  const nextMonth = monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, "0")}`;
  const rangeStart = `${month}-01`;
  const rangeEnd = `${nextMonth}-01`;

  const supabase = getSupabaseServerClient();

  const [salesRes, locRes] = await Promise.all([
    supabase
      .from("loyverse_daily_sales")
      .select("location_id, store_id, date, sales_by_item")
      .gte("date", rangeStart)
      .lt("date", rangeEnd),
    supabase.from("locations").select("id, name, slug").eq("organization_id", DEFAULT_ORG_ID),
  ]);
  if (salesRes.error) throw new Error(salesRes.error.message);

  const idToName = new Map<string, string>();
  const samuiIds = new Set<string>();
  for (const loc of locRes.data ?? []) {
    const id = (loc as { id: string }).id;
    const name = (loc as { name: string }).name as string;
    const slug = (loc as { slug?: string | null }).slug ?? "";
    idToName.set(id, name);
    if (`${name} ${slug}`.toLowerCase().includes("samui")) samuiIds.add(id);
  }

  type Acc = {
    title: string;
    p1d: number; p1a: number;
    p2d: number; p2a: number;
    p3d: number; p3a: number;
  };
  const byLoc = new Map<string, Acc>();

  for (const row of salesRes.data ?? []) {
    const r = row as {
      location_id: string | null;
      store_id: string;
      date: string;
      sales_by_item: SalesItem[] | null;
    };
    const items = Array.isArray(r.sales_by_item) ? r.sales_by_item : [];
    if (items.length === 0) continue;
    const day = Number((r.date ?? "").slice(8, 10));
    if (!day) continue;
    const period = periodForDay(day);

    const key = r.location_id ?? `store:${r.store_id}`;
    const title = (r.location_id ? idToName.get(r.location_id) : null) ?? r.location_id ?? r.store_id;

    // Samui si location Samui OU marqueurs adult/child présents sur la ligne.
    const hasAdultChildMarkers = items.some((it) => {
      const n = normalizeItemName(it.item_name);
      return n === "a entry adult" || n === "a entry child";
    });
    const isSamui = (r.location_id ? samuiIds.has(r.location_id) : false) || hasAdultChildMarkers;

    let drinks = 0;
    let adults = 0;
    for (const it of items) {
      const qty = Number(it.quantity ?? 0);
      if (!qty) continue;
      if (isSamui) {
        const n = normalizeItemName(it.item_name);
        if (n === "a entry adult") adults += qty;
        // "a entry child" exclu volontairement (adultes uniquement).
        if (resolveSalesBucketForSamui(it.category_id, it.category_name, it.item_name) === "drinks") {
          drinks += qty;
        }
      } else {
        const bucket = resolveSalesBucket(it.category_id, it.category_name, it.item_name);
        if (bucket === "ticket") adults += qty;
        else if (bucket === "drinks") drinks += qty;
      }
    }

    const acc = byLoc.get(key) ?? { title, p1d: 0, p1a: 0, p2d: 0, p2a: 0, p3d: 0, p3a: 0 };
    // Garde le premier titre non-technique rencontré.
    if (acc.title.startsWith("store:") && !title.startsWith("store:")) acc.title = title;
    if (period === 1) { acc.p1d += drinks; acc.p1a += adults; }
    else if (period === 2) { acc.p2d += drinks; acc.p2a += adults; }
    else { acc.p3d += drinks; acc.p3a += adults; }
    byLoc.set(key, acc);
  }

  const rows: DrinksRateRow[] = Array.from(byLoc.entries()).map(([locationId, a]) => ({
    locationId,
    locationTitle: shortName(a.title),
    p1: finalize(Math.round(a.p1d), Math.round(a.p1a)),
    p2: finalize(Math.round(a.p2d), Math.round(a.p2a)),
    p3: finalize(Math.round(a.p3d), Math.round(a.p3a)),
    total: finalize(Math.round(a.p1d + a.p2d + a.p3d), Math.round(a.p1a + a.p2a + a.p3a)),
  }));
  rows.sort((x, y) => x.locationTitle.localeCompare(y.locationTitle));
  return rows;
}
