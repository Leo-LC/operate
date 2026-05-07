export interface DailyEntry {
  id: string;
  organization_id: string;
  location_id: string;
  entry_date: string;

  sales_drinks_net: number;
  sales_ticket_net: number;
  sales_snack_net: number;
  sales_goodies_net: number;
  sales_card_surcharge: number;

  // manually entered by staff — sales amounts already include VAT
  vat_7: number;

  payment_cash: number;
  payment_scan: number;
  payment_credit_card: number;

  exp_staff_food_cash: number;
  exp_drinks_cash: number;
  exp_goodies_cash: number;
  exp_animals_cash: number;
  exp_supply_cash: number;
  exp_boss_fees_cash: number;
  exp_other_cash: number;

  exp_makro_bank: number;
  exp_other_bank: number;

  hr_salary_cash: number;
  hr_salary_bank: number;
  hr_challenge_cash: number;
  hr_service_charge_cash: number;
  hr_accompte_cash: number;

  cash_end_day: number;
  cash_to_boss: number;
  cash_safe: number;
  cash_safe_is_override: boolean;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type EntryNumericKey = keyof Omit<DailyEntry, "id" | "organization_id" | "location_id" | "entry_date" | "notes" | "cash_safe_is_override" | "created_at" | "updated_at">;

export const EMPTY_ENTRY: Omit<DailyEntry, "id" | "organization_id" | "location_id" | "entry_date" | "created_at" | "updated_at"> = {
  sales_drinks_net: 0, sales_ticket_net: 0, sales_snack_net: 0, sales_goodies_net: 0, sales_card_surcharge: 0,
  vat_7: 0,
  payment_cash: 0, payment_scan: 0, payment_credit_card: 0,
  exp_staff_food_cash: 0, exp_drinks_cash: 0, exp_goodies_cash: 0, exp_animals_cash: 0, exp_supply_cash: 0, exp_boss_fees_cash: 0, exp_other_cash: 0,
  exp_makro_bank: 0, exp_other_bank: 0,
  hr_salary_cash: 0, hr_salary_bank: 0, hr_challenge_cash: 0, hr_service_charge_cash: 0, hr_accompte_cash: 0,
  cash_end_day: 0, cash_to_boss: 0, cash_safe: 0, cash_safe_is_override: false,
  notes: null,
};

/** Sum of sales lines entered by staff. Amounts are VAT-inclusive as entered. */
export function salesNetTotal(e: DailyEntry): number {
  return e.sales_drinks_net + e.sales_ticket_net + e.sales_snack_net + e.sales_goodies_net;
}

export function expCashTotal(e: DailyEntry): number {
  return e.exp_staff_food_cash + e.exp_drinks_cash + e.exp_goodies_cash + e.exp_animals_cash + e.exp_supply_cash + e.exp_boss_fees_cash + e.exp_other_cash;
}

export function expBankTotal(e: DailyEntry): number {
  return e.exp_makro_bank + e.exp_other_bank;
}

export function expTotal(e: DailyEntry): number {
  return expCashTotal(e) + expBankTotal(e);
}

export function hrTotal(e: DailyEntry): number {
  return e.hr_salary_cash + e.hr_salary_bank + e.hr_challenge_cash + e.hr_service_charge_cash + e.hr_accompte_cash;
}

/** Sales amounts are VAT-inclusive, so delta = payments − salesNetTotal */
export function paymentDelta(e: DailyEntry): number {
  return e.payment_cash + e.payment_scan + e.payment_credit_card - salesNetTotal(e);
}

/** cash received - cash expenses = cash remaining at end of day */
export function cashEndDayCalc(e: DailyEntry): number {
  return e.payment_cash - expCashTotal(e);
}

/** prev day's safe + today's end-of-day cash - cash sent to boss */
export function cashSafeCalc(cashEndDay: number, prevCashSafe: number, cashToBoss: number): number {
  return prevCashSafe + cashEndDay - cashToBoss;
}

// ── Monthly fixed expenses ────────────────────────────────────────────────────

export interface MonthlyFixedExpense {
  id: string;
  organization_id: string;
  location_id: string;
  year: number;
  month: number; // 1–12
  category_values: Record<string, number>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function fixedExpenseTotal(e: MonthlyFixedExpense): number {
  return Object.values(e.category_values).reduce((s, v) => s + (v ?? 0), 0);
}

export interface FixedExpenseCategory {
  id: string;
  organization_id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// ── Legacy (kept for backward compat with existing API route) ────────────────

export interface MonthlyFixedCost {
  id: string;
  location_id: string;
  month: string;
  amount: number;
  notes: string | null;
}

// ── Form helpers ─────────────────────────────────────────────────────────────

export type EntryFormState = {
  [K in keyof typeof EMPTY_ENTRY]: K extends "notes" ? string : K extends "cash_safe_is_override" ? boolean : string;
};

/** Only includes keys from EMPTY_ENTRY — prevents metadata fields (entry_date, id, etc.)
 *  from leaking into form state and corrupting saves. */
export function toFormState(entry: Partial<DailyEntry>): EntryFormState {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(EMPTY_ENTRY)) {
    const val = (entry as Record<string, unknown>)[key] ?? (EMPTY_ENTRY as Record<string, unknown>)[key];
    if (key === "notes") {
      result[key] = val === null || val === undefined ? "" : String(val);
    } else if (key === "cash_safe_is_override") {
      result[key] = Boolean(val);
    } else {
      result[key] = val === null || val === undefined ? "" : String(val);
    }
  }
  return result as EntryFormState;
}

export function fromFormState(form: EntryFormState): Omit<DailyEntry, "id" | "organization_id" | "location_id" | "entry_date" | "created_at" | "updated_at"> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (k === "notes") {
      result[k] = (v as string).trim() || null;
    } else if (k === "cash_safe_is_override") {
      result[k] = Boolean(v);
    } else {
      result[k] = parseFloat(v as string) || 0;
    }
  }
  return result as ReturnType<typeof fromFormState>;
}
