// Agrégation "sales by item" pour l'onglet Analyse (/loyverse).
// Source : loyverse_daily_sales.sales_by_item — déjà signé (REFUND négatif,
// annulés exclus) par computeSalesAggregates au moment du sync.
//
// Le matching se fait sur le NOM normalisé (minuscule, sans accents, espaces
// collés) : item_id est null pour les lignes non-mappées du catalogue, il
// n'est donc pas une clé fiable.

export type RawLineItem = {
  item_id?: string | null;
  item_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  quantity?: number | null;
  total_money?: number | null;
};

export type RawSalesRow = {
  location_id: string | null;
  date: string;
  sales_by_item: RawLineItem[] | null;
};

export type ItemAggregate = {
  item_name: string;
  category_name: string | null;
  quantity: number;
  total_money: number;
  /** location_id (ou NO_LOCATION_KEY) -> total_money. */
  by_location: Record<string, number>;
};

export type PriceBucket = { p: number; n: number; q: number; m: number };

/** rows incluant la colonne prices_by_item du sync. */
export type PriceRow = {
  prices_by_item?: Record<string, { p: number; n: number; q: number; m: number }[]> | null;
} & Record<string, unknown>;

/**
 * Fusionne les buckets "par prix tapé" de toutes les lignes/périodes :
 * { [item_name display]: PriceBucket[] trié par prix asc }. n = nb de lignes
 * (~transactions), q/m gardent le signe (REFUND).
 */
export function aggregatePrices(rows: PriceRow[]): Record<string, PriceBucket[]> {
  type Acc = { display: string; buckets: Map<number, PriceBucket> };
  const byNorm = new Map<string, Acc>();
  for (const row of rows) {
    for (const rawName of Object.keys(row.prices_by_item ?? {})) {
      const key = normalizeName(rawName);
      let acc = byNorm.get(key);
      if (!acc) {
        acc = { display: rawName, buckets: new Map() };
        byNorm.set(key, acc);
      } else if (countUppercaseNames(rawName) > countUppercaseNames(acc.display)) {
        acc.display = rawName;
      }
      for (const b of row.prices_by_item?.[rawName] ?? []) {
        if (typeof b?.p !== "number") continue;
        const cur = acc.buckets.get(b.p) ?? { p: b.p, n: 0, q: 0, m: 0 };
        cur.n += b.n ?? 0;
        cur.q += b.q ?? 0;
        cur.m += b.m ?? 0;
        acc.buckets.set(b.p, cur);
      }
    }
  }
  const out: Record<string, PriceBucket[]> = {};
  for (const acc of Array.from(byNorm.values())) {
    out[acc.display] = Array.from(acc.buckets.values()).sort((a, b) => a.p - b.p) as PriceBucket[];
  }
  return out;
}

function countUppercaseNames(name: string): number {
  let n = 0;
  for (const c of name) if (c >= "A" && c <= "Z") n++;
  return n;
}

export type ItemSalesResult = {
  items: ItemAggregate[];
  /** item_name display -> { date -> { q, m } } (toutes locations confondues). */
  series: Record<string, Record<string, { q: number; m: number }>>;
  /** Toutes les dates de la plage (asc), permettant au client de compter les trous. */
  dates: string[];
  /** Dates ayant au moins une ligne dans loyverse_daily_sales. */
  days_with_rows: string[];
  locations: Record<string, string>; // location_id -> name ("" si null → "Sans shop")
};

export const NO_LOCATION_KEY = "__none__";

/** lowercase, sans accents (NFD), espaces simples. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Match insensible casse/accents, multi-termes : chaque mot du query doit être présent. */
export function searchMatch(query: string, name: string): boolean {
  const q = normalizeName(query);
  if (!q) return true;
  const target = normalizeName(name);
  const terms = q.split(" ").filter(Boolean);
  return terms.every((t) => target.includes(t));
}

function countUppercase(name: string): number {
  let n = 0;
  for (const c of name) if (c >= "A" && c <= "Z") n++;
  return n;
}

function addDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day + n));
  return dt.toISOString().slice(0, 10);
}

export function dayCountInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.floor((b - a) / 86400000) + 1;
}

/** Plage complète d'un mois YYYY-MM (Bangkok = dates calendaires, UTC-safe). */
export function monthRange(month: string): { first: string; last: string } {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { first, last };
}

const UNKNOWN_CATEGORY = "Unknown";

export function aggregateItemSales(rows: RawSalesRow[], from: string, to: string): ItemSalesResult {
  type Acc = {
    display: string;
    category_name: string | null;
    quantity: number;
    total_money: number;
    by_location: Map<string, number>;
    daily: Map<string, { q: number; m: number }>;
  };
  const byNorm = new Map<string, Acc>();

  const daysWithRows = new Set<string>();
  const locationIds = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row.date !== "string") continue;
    daysWithRows.add(row.date);
    const locKey = row.location_id ?? NO_LOCATION_KEY;
    locationIds.add(locKey);
    for (const line of row.sales_by_item ?? []) {
      const rawName = (line.item_name ?? "").trim();
      if (!rawName) continue;
      const key = normalizeName(rawName);
      let acc = byNorm.get(key);
      if (!acc) {
        acc = { display: rawName, category_name: null, quantity: 0, total_money: 0, by_location: new Map(), daily: new Map() };
        byNorm.set(key, acc);
      } else if (countUppercase(rawName) > countUppercase(acc.display)) {
        // Variante du même nom : on garde l'orthographe la plus « titrée » ("Postcard A5" > "postcard a5")
        acc.display = rawName;
      }
      const qty = line.quantity ?? 0;
      const money = line.total_money ?? 0;
      acc.quantity += qty;
      acc.total_money += money;
      const cat = line.category_name && line.category_name !== UNKNOWN_CATEGORY ? line.category_name : null;
      // catégorie stable tant qu'on n'a vu que des null/"Unknown" ; sinon la première vue gagne
      if (acc.category_name === null && cat) acc.category_name = cat;
      acc.by_location.set(locKey, (acc.by_location.get(locKey) ?? 0) + money);
      const daily = acc.daily.get(row.date) ?? { q: 0, m: 0 };
      daily.q += qty;
      daily.m += money;
      acc.daily.set(row.date, daily);
    }
  }

  const dates: string[] = [];
  const nDays = Math.max(0, dayCountInclusive(from, to));
  if (nDays > 0 && nDays <= 400) {
    for (let i = 0; i < nDays; i++) dates.push(addDays(from, i));
  }

  const items: ItemAggregate[] = Array.from(byNorm.values())
    .map((acc) => {
      const by_location: Record<string, number> = {};
      acc.by_location.forEach((money, loc) => { by_location[loc] = money; });
      return {
        item_name: acc.display,
        category_name: acc.category_name,
        quantity: acc.quantity,
        total_money: acc.total_money,
        by_location,
      };
    })
    .sort((a, b) => b.total_money - a.total_money);

  const series: Record<string, Record<string, { q: number; m: number }>> = {};
  for (const acc of Array.from(byNorm.values())) {
    const days: Record<string, { q: number; m: number }> = {};
    for (const d of dates) {
      const v = acc.daily.get(d);
      days[d] = { q: v?.q ?? 0, m: v?.m ?? 0 };
    }
    series[acc.display] = days;
  }

  return { items, series, dates, days_with_rows: Array.from(daysWithRows).sort(), locations: {} };
}
