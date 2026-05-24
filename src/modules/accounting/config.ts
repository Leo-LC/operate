import type { DailyEntry } from "@/modules/accounting/types";
import {
  salesNetTotal,
  paymentDelta,
  expCashTotal,
  expBankTotal,
  expTotal,
  hrTotal,
} from "@/modules/accounting/types";

// ── Field & section config ────────────────────────────────────────────────────

export type CalcKey =
  | "__sales_net__"
  | "__payment_delta__"
  | "__exp_cash_total__"
  | "__exp_bank_total__"
  | "__exp_total__"
  | "__hr_total__";

export type FieldKey = keyof DailyEntry | CalcKey;

export interface AccountingField {
  key: FieldKey;
  label: string;
  shortLabel: string;
  calculated: boolean;
  visibleInOverview: boolean;
  exportable: boolean;
}

export interface AccountingSection {
  id: "sales" | "payments" | "expenses" | "hr" | "treasury";
  label: string;
  headerBg: string;
  headerColor: string;
  fields: AccountingField[];
}

export function resolveField(entry: DailyEntry, key: FieldKey): number {
  switch (key as CalcKey) {
    case "__sales_net__":      return salesNetTotal(entry);
    case "__payment_delta__":  return paymentDelta(entry);
    case "__exp_cash_total__": return expCashTotal(entry);
    case "__exp_bank_total__": return expBankTotal(entry);
    case "__exp_total__":      return expTotal(entry);
    case "__hr_total__":       return hrTotal(entry);
    default:
      return (entry as unknown as Record<string, number>)[key as string] ?? 0;
  }
}

export const DAILY_ENTRY_SECTIONS: AccountingSection[] = [
  {
    id: "sales",
    label: "Sales",
    headerBg: "var(--good-soft)",
    headerColor: "var(--good)",
    fields: [
      { key: "sales_drinks_net",     label: "Drinks",         shortLabel: "Drinks",    calculated: false, visibleInOverview: false, exportable: true },
      { key: "sales_ticket_net",     label: "Tickets",        shortLabel: "Tickets",   calculated: false, visibleInOverview: false, exportable: true },
      { key: "sales_snack_net",      label: "Snacks",         shortLabel: "Snacks",    calculated: false, visibleInOverview: false, exportable: true },
      { key: "sales_goodies_net",    label: "Goodies",        shortLabel: "Goodies",   calculated: false, visibleInOverview: false, exportable: true },
      { key: "sales_card_surcharge", label: "Card surcharge", shortLabel: "Surcharge", calculated: false, visibleInOverview: false, exportable: true },
      { key: "__sales_net__",        label: "Sales total",    shortLabel: "Total",     calculated: true,  visibleInOverview: true,  exportable: true },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    headerBg: "var(--info-soft)",
    headerColor: "var(--info)",
    fields: [
      { key: "vat_7",               label: "VAT 7% (manual)", shortLabel: "VAT",       calculated: false, visibleInOverview: false, exportable: true },
      { key: "payment_cash",        label: "Cash",            shortLabel: "Cash",      calculated: false, visibleInOverview: true,  exportable: true },
      { key: "payment_scan",        label: "Scan",            shortLabel: "Scan",      calculated: false, visibleInOverview: true,  exportable: true },
      { key: "payment_credit_card", label: "Credit card",     shortLabel: "CC",        calculated: false, visibleInOverview: true,  exportable: true },
      { key: "__payment_delta__",   label: "Payment delta",   shortLabel: "Δ Pay",     calculated: true,  visibleInOverview: true,  exportable: true },
    ],
  },
  {
    id: "expenses",
    label: "Expenses",
    headerBg: "var(--warn-soft)",
    headerColor: "var(--warn)",
    fields: [
      { key: "exp_staff_food_cash",  label: "Staff food",     shortLabel: "Staff food", calculated: false, visibleInOverview: false, exportable: true },
      { key: "exp_drinks_cash",      label: "Drinks",         shortLabel: "Drinks",     calculated: false, visibleInOverview: false, exportable: true },
      { key: "exp_goodies_cash",     label: "Goodies",        shortLabel: "Goodies",    calculated: false, visibleInOverview: false, exportable: true },
      { key: "exp_animals_cash",     label: "Animals",        shortLabel: "Animals",    calculated: false, visibleInOverview: false, exportable: true },
      { key: "exp_supply_cash",      label: "Supply",         shortLabel: "Supply",     calculated: false, visibleInOverview: false, exportable: true },
      { key: "exp_boss_fees_cash",   label: "Boss fees",      shortLabel: "Boss fees",  calculated: false, visibleInOverview: false, exportable: true },
      { key: "exp_other_cash",       label: "Other cash",     shortLabel: "Other",      calculated: false, visibleInOverview: false, exportable: true },
      { key: "__exp_cash_total__",   label: "Cash exp total", shortLabel: "Cash tot",   calculated: true,  visibleInOverview: true,  exportable: true },
      { key: "exp_makro_bank",       label: "Makro (bank)",   shortLabel: "Makro",      calculated: false, visibleInOverview: false, exportable: true },
      { key: "exp_other_bank",       label: "Other (bank)",   shortLabel: "Other bank", calculated: false, visibleInOverview: false, exportable: true },
      { key: "__exp_bank_total__",   label: "Bank exp total", shortLabel: "Bank tot",   calculated: true,  visibleInOverview: true,  exportable: true },
      { key: "__exp_total__",        label: "Exp total",      shortLabel: "Total exp",  calculated: true,  visibleInOverview: false, exportable: true },
    ],
  },
  {
    id: "hr",
    label: "HR",
    headerBg: "var(--bad-soft)",
    headerColor: "var(--bad)",
    fields: [
      { key: "hr_salary_cash",         label: "Salary cash",    shortLabel: "Salary",    calculated: false, visibleInOverview: false, exportable: true },
      { key: "hr_salary_bank",         label: "Salary bank",    shortLabel: "Sal. bank", calculated: false, visibleInOverview: false, exportable: true },
      { key: "hr_challenge_cash",      label: "Challenge",      shortLabel: "Challenge", calculated: false, visibleInOverview: false, exportable: true },
      { key: "hr_service_charge_cash", label: "Service charge", shortLabel: "Svc chg",   calculated: false, visibleInOverview: false, exportable: true },
      { key: "hr_accompte_cash",       label: "Acompte",        shortLabel: "Acompte",   calculated: false, visibleInOverview: false, exportable: true },
      { key: "__hr_total__",           label: "HR total",       shortLabel: "HR",        calculated: true,  visibleInOverview: true,  exportable: true },
    ],
  },
  {
    id: "treasury",
    label: "Treasury",
    headerBg: "var(--bronze-soft)",
    headerColor: "var(--bronze)",
    fields: [
      { key: "cash_end_day", label: "Cash end of day", shortLabel: "EOD cash", calculated: true,  visibleInOverview: false, exportable: true },
      { key: "cash_to_boss", label: "Cash to boss",    shortLabel: "→ Boss",   calculated: false, visibleInOverview: true,  exportable: true },
      { key: "cash_safe",    label: "Cash safe",       shortLabel: "Safe",     calculated: true,  visibleInOverview: true,  exportable: true },
    ],
  },
];

export const ALL_DAILY_FIELDS: AccountingField[] = DAILY_ENTRY_SECTIONS.flatMap((s) => s.fields);
export const OVERVIEW_FIELDS: AccountingField[] = ALL_DAILY_FIELDS.filter((f) => f.visibleInOverview);

// ── Monthly fixed expense category (loaded dynamically from DB) ───────────────

export interface MonthlyExpenseCategory {
  key: string;
  label: string;
  sort_order: number;
}
