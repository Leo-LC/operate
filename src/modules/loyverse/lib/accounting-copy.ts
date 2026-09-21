import { resolvePaymentBucket } from "@/modules/loyverse-sandbox/mapping-config";

// ── Accounting copy-row config — same order as Google Sheets DAILY_ENTRIES ──
// Duplicated from ShiftsPreview (src/modules/loyverse/components/ShiftsPreview.tsx)
// which must stay untouched. This shared lib powers the multi-day "Copy" tab
// in accounting with the exact same single-line format.

export const TEMPLATE_COLUMNS = [
  "date",
  "sales_drinks_net",
  "sales_ticket_net",
  "sales_snack_net",
  "sales_goodies_net",
  "sales_card_surcharge",
  "sales_net_inc_vat",
  "vat_7",
  "payment_cash",
  "payment_scan",
  "payment_credit_card",
  "payment_delta",
  "exp_staff_food_cash",
  "exp_drinks_cash",
  "exp_goodies_cash",
  "exp_animals_cash",
  "exp_supply_cash",
  "exp_boss_fees_cash",
  "exp_other_cash",
  "exp_cash_total",
  "exp_makro_bank",
  "exp_other_bank",
  "exp_bank_total",
  "exp_total",
  "hr_salary_cash",
  "hr_salary_bank",
  "hr_challenge_cash",
  "hr_service_charge_cash",
  "hr_accompte_cash",
  "hr_total",
  "cash_end_day",
  "cash_to_boss",
  "cash_safe",
] as const;

export type TemplateColumn = (typeof TEMPLATE_COLUMNS)[number];

export const COMPUTED_COLS = new Set<string>([
  "sales_net_inc_vat",
  "payment_delta",
  "exp_cash_total",
  "exp_bank_total",
  "exp_total",
  "hr_total",
  "cash_end_day",
  "cash_safe",
]);

// Visible columns in accounting copy table — stop at CC, no date, no scroll on desktop
export const VISIBLE_COLUMNS = TEMPLATE_COLUMNS.filter(
  (c) => c !== "date" && TEMPLATE_COLUMNS.indexOf(c) <= TEMPLATE_COLUMNS.indexOf("payment_credit_card"),
) as unknown as typeof TEMPLATE_COLUMNS;

export const COLUMN_LABELS: Record<string, string> = {
  date: "date",
  sales_drinks_net: "Drinks",
  sales_ticket_net: "Ticket",
  sales_snack_net: "Snack",
  sales_goodies_net: "Goodies",
  sales_card_surcharge: "Surcharge",
  sales_net_inc_vat: "Sales total",
  vat_7: "VAT 7%",
  payment_cash: "Cash",
  payment_scan: "Scan",
  payment_credit_card: "CC",
  payment_delta: "Δ Pay",
  exp_staff_food_cash: "Staff food",
  exp_drinks_cash: "Drinks",
  exp_goodies_cash: "Goodies",
  exp_animals_cash: "Animals",
  exp_supply_cash: "Supply",
  exp_boss_fees_cash: "Boss fees",
  exp_other_cash: "Other cash",
  exp_cash_total: "Cash tot",
  exp_makro_bank: "Makro",
  exp_other_bank: "Other bank",
  exp_bank_total: "Bank tot",
  exp_total: "Exp total",
  hr_salary_cash: "Salary",
  hr_salary_bank: "Sal. bank",
  hr_challenge_cash: "Challenge",
  hr_service_charge_cash: "Svc chg",
  hr_accompte_cash: "Acompte",
  hr_total: "HR",
  cash_end_day: "EOD cash",
  cash_to_boss: "→ Boss",
  cash_safe: "Safe",
};

export interface SnapshotLike {
  sales_drinks_net: number | string | null;
  sales_ticket_net: number | string | null;
  sales_snack_net: number | string | null;
  sales_goodies_net: number | string | null;
  sales_card_surcharge: number | string | null;
  vat_7: number | string | null;
  payment_cash: number | string | null;
  payment_scan: number | string | null;
  payment_credit_card: number | string | null;
}

export function n(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const p = parseFloat(v.replace(/,/g, ""));
    return Number.isFinite(p) ? p : 0;
  }
  return 0;
}

export function formatCopyNumber(v: number): string {
  // raw number, no thousands sep, dot decimal — matches parseNumeric() in import-sheets/lib.ts
  if (!Number.isFinite(v) || v === 0) return v === 0 ? "0" : "";
  const s = String(v);
  return s;
}

export function buildAccountingValues(
  shift: Record<string, unknown> | null,
  snapshot: SnapshotLike | null,
  date: string,
  paymentMap: Map<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of TEMPLATE_COLUMNS) out[c] = "";
  out["date"] = date;

  if (!shift && !snapshot) return out;

  // Sales — prefer snapshot (correct bucket mapping), fallback 0
  if (snapshot) {
    out["sales_drinks_net"] = formatCopyNumber(n(snapshot.sales_drinks_net));
    out["sales_ticket_net"] = formatCopyNumber(n(snapshot.sales_ticket_net));
    out["sales_snack_net"] = formatCopyNumber(n(snapshot.sales_snack_net));
    out["sales_goodies_net"] = formatCopyNumber(n(snapshot.sales_goodies_net));
    // surcharge: prefer shift.surcharge, fallback snapshot
    const shiftSurcharge = shift ? n((shift as Record<string, unknown>)["surcharge"]) : 0;
    const val = shiftSurcharge !== 0 ? shiftSurcharge : n(snapshot.sales_card_surcharge);
    out["sales_card_surcharge"] = formatCopyNumber(val);
  } else if (shift) {
    // No snapshot — try shift net_sales as fallback? Leave sales_* empty since shift has no breakdown
    const s = n((shift as Record<string, unknown>)["surcharge"]);
    if (s) out["sales_card_surcharge"] = formatCopyNumber(s);
  }

  // VAT — sum of shift.taxes[].money_amount, fallback snapshot vat_7
  if (shift && Array.isArray(shift["taxes"])) {
    const sum = (shift["taxes"] as Record<string, unknown>[]).reduce(
      (acc, t) => acc + n(t["money_amount"] ?? t["amount"] ?? t["tax_amount"]),
      0,
    );
    if (sum !== 0 || (shift["taxes"] as unknown[]).length > 0) out["vat_7"] = formatCopyNumber(sum);
    else if (snapshot) out["vat_7"] = formatCopyNumber(n(snapshot.vat_7));
  } else if (snapshot) {
    out["vat_7"] = formatCopyNumber(n(snapshot.vat_7));
  }

  // Payments — from shift.payments bucketed, fallback snapshot
  if (shift && Array.isArray(shift["payments"]) && (shift["payments"] as unknown[]).length > 0) {
    const buckets: Record<string, number> = { cash: 0, scan: 0, credit_card: 0 };
    for (const p of shift["payments"] as Record<string, unknown>[]) {
      const pid = String(p["payment_type_id"] ?? "");
      const name = paymentMap.get(pid) ?? pid;
      const type = p["type"] as string | undefined;
      const bucket = resolvePaymentBucket(type ?? null, name ?? null);
      const amt = n(p["money_amount"]);
      if (bucket === "cash") buckets.cash += amt;
      else if (bucket === "scan") buckets.scan += amt;
      else if (bucket === "credit_card") buckets.credit_card += amt;
    }
    out["payment_cash"] = formatCopyNumber(buckets.cash);
    out["payment_scan"] = formatCopyNumber(buckets.scan);
    out["payment_credit_card"] = formatCopyNumber(buckets.credit_card);
  } else if (snapshot) {
    out["payment_cash"] = formatCopyNumber(n(snapshot.payment_cash));
    out["payment_scan"] = formatCopyNumber(n(snapshot.payment_scan));
    out["payment_credit_card"] = formatCopyNumber(n(snapshot.payment_credit_card));
  }

  // computed + manual expense/HR/treasury stay "" (sheet formulas / manual input)
  COMPUTED_COLS.forEach((c) => {
    out[c] = "";
  });
  return out;
}

/** Single-day copy line — same format as Shift & Sales "copy" button. */
export function buildCopyLine(values: Record<string, string>): string {
  return (VISIBLE_COLUMNS as unknown as string[]).map((c) => values[c] ?? "").join("\t");
}

/** Multi-day copy text — one line per day, joined with \n, ready for Excel paste. */
export function buildCopyText(lines: string[]): string {
  return lines.join("\n");
}

export function formatDateDDMMYYYY(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  return `${m[3]} ${m[2]} ${m[1]}`;
}
