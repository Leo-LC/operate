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

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type EntryNumericKey = keyof Omit<DailyEntry, "id" | "organization_id" | "location_id" | "entry_date" | "notes" | "created_at" | "updated_at">;

export const EMPTY_ENTRY: Omit<DailyEntry, "id" | "organization_id" | "location_id" | "entry_date" | "created_at" | "updated_at"> = {
  sales_drinks_net: 0, sales_ticket_net: 0, sales_snack_net: 0, sales_goodies_net: 0, sales_card_surcharge: 0,
  payment_cash: 0, payment_scan: 0, payment_credit_card: 0,
  exp_staff_food_cash: 0, exp_drinks_cash: 0, exp_goodies_cash: 0, exp_animals_cash: 0, exp_supply_cash: 0, exp_boss_fees_cash: 0, exp_other_cash: 0,
  exp_makro_bank: 0, exp_other_bank: 0,
  hr_salary_cash: 0, hr_salary_bank: 0, hr_challenge_cash: 0, hr_service_charge_cash: 0, hr_accompte_cash: 0,
  cash_end_day: 0, cash_to_boss: 0, cash_safe: 0,
  notes: null,
};

export function salesNetTotal(e: DailyEntry): number {
  return e.sales_drinks_net + e.sales_ticket_net + e.sales_snack_net + e.sales_goodies_net;
}

export function salesIncVat(e: DailyEntry): number {
  const net = salesNetTotal(e);
  return net * 1.07;
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

export function paymentDelta(e: DailyEntry): number {
  const incVat = salesIncVat(e);
  const payments = e.payment_cash + e.payment_scan + e.payment_credit_card;
  return payments - incVat;
}

export interface MonthlyFixedCost {
  id: string;
  location_id: string;
  month: string;
  amount: number;
  notes: string | null;
}

// Form state mirrors DailyEntry but all numerics are strings for controlled inputs
export type EntryFormState = {
  [K in keyof typeof EMPTY_ENTRY]: K extends "notes" ? string : string;
};

export function toFormState(entry: Partial<DailyEntry>): EntryFormState {
  const base = { ...EMPTY_ENTRY, ...entry };
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    result[k] = v === null || v === undefined ? "" : String(v);
  }
  return result as EntryFormState;
}

export function fromFormState(form: EntryFormState): Omit<DailyEntry, "id" | "organization_id" | "location_id" | "entry_date" | "created_at" | "updated_at"> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form)) {
    if (k === "notes") {
      result[k] = v.trim() || null;
    } else {
      result[k] = parseFloat(v) || 0;
    }
  }
  return result as ReturnType<typeof fromFormState>;
}
