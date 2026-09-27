/**
 * End of Month (Fin de mois) — Boss tab logic.
 * Pure helpers + shared French labels so the aggregation route and the
 * client component (and tests) use the same vocabulary.
 *
 * Data sources — everything live, no snapshots:
 * - Cash safes: latest entered `daily_entries.cash_safe` within the month.
 * - Salaires: current `employees` base salaries + service charge computed on
 *   revenue-to-date (same formula as POST /api/payments/calculate) + manual
 *   payment adjustments for the month.
 * - Loyers / Marketing / Fournisseurs / Autres: `recurring_costs` +
 *   monthly overrides for the month (override wins over estimate,
 *   multi-shop rules split equally — same rule as /api/reports/accounting).
 */

export type EndOfMonthCategoryKey = "salaires" | "loyers" | "marketing" | "fournisseurs" | "autres";

export const END_OF_MONTH_CATEGORIES: { key: EndOfMonthCategoryKey; label: string }[] = [
  { key: "salaires", label: "Salaires" },
  { key: "loyers", label: "Loyers" },
  { key: "marketing", label: "Marketing" },
  { key: "fournisseurs", label: "Fournisseurs" },
  { key: "autres", label: "Autres" },
];

export const MONTH_LONG = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export interface EndOfMonthShopSafe {
  locationId: string;
  name: string;
  /** Null when no daily entry exists for the shop in the month — never silently 0. */
  amount: number | null;
  missing: boolean;
}

export interface EndOfMonthCategoryLine {
  label: string;
  amount: number;
  /** Per-line finalized flag (used by Salaires preview lines). */
  finalized?: boolean;
}

export interface EndOfMonthCategory {
  key: EndOfMonthCategoryKey;
  label: string;
  /** Null when not finalized — never a misleading total. */
  total: number | null;
  finalized: boolean;
  paymentCount: number;
  lines: EndOfMonthCategoryLine[];
}

export interface EndOfMonthTotals {
  cash: number;
  takeOut: number;
  /** Null while any input is missing / not finalized — never a partial subtraction. */
  remaining: number | null;
  complete: boolean;
  missingSafeShops: string[];
  unfinalizedCategories: string[];
}

/** One shop block: cash in its safe + its upcoming outflows. */
export interface EndOfMonthShopSalaries {
  total: number;
  base: number;
  serviceCharge: number;
  adjustments: number;
  headcount: number;
}

export interface EndOfMonthShop {
  locationId: string;
  name: string;
  /** Null when no daily entry exists for the shop in the month — never silently 0. */
  safe: number | null;
  missing: boolean;
  salaries: EndOfMonthShopSalaries;
  costs: Record<Exclude<EndOfMonthCategoryKey, "salaires">, number>;
  takeOut: number;
}

/** Total outflows for one shop. */
export function shopTakeOut(shop: Pick<EndOfMonthShop, "salaries" | "costs">): number {
  return (
    shop.salaries.total +
    shop.costs.loyers +
    shop.costs.marketing +
    shop.costs.fournisseurs +
    shop.costs.autres
  );
}

/** Cash left in one shop's safe after its outflows — null while the safe is missing. */
export function shopRemaining(shop: Pick<EndOfMonthShop, "safe" | "missing" | "takeOut">): number | null {
  if (shop.missing || shop.safe == null) return null;
  return shop.safe - shop.takeOut;
}

export function shortShopName(name: string): string {
  return name.replace(/^Capybara Coffee\s*/i, "").trim() || name;
}

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_LONG[month - 1] ?? ""} ${year}`;
}

export function monthBounds(year: number, month: number): { start: string; end: string; nextMonthStart: string } {
  const mm = String(month).padStart(2, "0");
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(endDay).padStart(2, "0")}`, nextMonthStart: next };
}

export function isValidMonthParam(value: string | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Map a `recurring_costs` category slug to a Boss-facing bucket (Salaires never comes from here). */
export function mapRecurringCategory(slug: string): Exclude<EndOfMonthCategoryKey, "salaires"> {
  const s = slug.toLowerCase();
  if (/(rent|loyer|lease|bail)/.test(s)) return "loyers";
  if (/(market|pub|ads|advert|promo|communic|influence)/.test(s)) return "marketing";
  if (/(suppl|fournis|vendor|makro|stock|invent|achat|purchase|marchand)/.test(s)) return "fournisseurs";
  return "autres";
}

/** Latest cash_safe per shop from month-filtered entries (entry with max entry_date wins). */
export function latestSafePerShop(
  entries: { location_id: string; entry_date: string; cash_safe: number | null }[],
  locations: { id: string; name: string }[],
): EndOfMonthShopSafe[] {
  const latest = new Map<string, { date: string; amount: number }>();
  for (const e of entries) {
    const prev = latest.get(e.location_id);
    if (!prev || e.entry_date >= prev.date) {
      latest.set(e.location_id, { date: e.entry_date, amount: Number(e.cash_safe ?? 0) });
    }
  }
  return locations.map((loc) => {
    const hit = latest.get(loc.id);
    if (!hit) return { locationId: loc.id, name: loc.name, amount: null, missing: true };
    return { locationId: loc.id, name: loc.name, amount: hit.amount, missing: false };
  });
}

/**
 * Reste en coffre = Espèces en coffre − Sorties prévues.
 * Missing safes are excluded from `cash` but the remainder stays null
 * while anything is missing / unfinalized (missing ≠ 0).
 */
export function computeEndOfMonthTotals(
  safes: EndOfMonthShopSafe[],
  categories: EndOfMonthCategory[],
): EndOfMonthTotals {
  const missingSafeShops = safes.filter((s) => s.missing).map((s) => shortShopName(s.name));
  const cash = safes.reduce((sum, s) => sum + (s.missing || s.amount == null ? 0 : s.amount), 0);
  const unfinalizedCategories = categories.filter((c) => !c.finalized || c.total == null).map((c) => c.label);
  const takeOut = categories.reduce((sum, c) => sum + (c.finalized && c.total != null ? c.total : 0), 0);
  const complete = missingSafeShops.length === 0 && unfinalizedCategories.length === 0;
  return { cash, takeOut, remaining: complete ? cash - takeOut : null, complete, missingSafeShops, unfinalizedCategories };
}

export function formatMoney(n: number): string {
  return `฿${Math.abs(Math.round(n)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
