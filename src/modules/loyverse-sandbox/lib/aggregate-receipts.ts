import type {
  AggregationMeta,
  CoverageResult,
  FieldDiff,
  LoyverseItem,
  LoyverseReceipt,
  ProposedChallengeEntry,
  ProposedDailyEntry,
} from "../types";
import { resolvePaymentBucket, resolveSalesBucket } from "../mapping-config";

const AUTO_FILLABLE_FIELDS = [
  "sales_drinks_net",
  "sales_ticket_net",
  "sales_snack_net",
  "sales_goodies_net",
  "sales_card_surcharge",
  "vat_7",
  "payment_cash",
  "payment_scan",
  "payment_credit_card",
] as const;

const FIELD_LABELS: Record<string, string> = {
  sales_drinks_net: "Sales — Drinks",
  sales_ticket_net: "Sales — Tickets",
  sales_snack_net: "Sales — Snacks",
  sales_goodies_net: "Sales — Goodies",
  sales_card_surcharge: "Card surcharge",
  vat_7: "VAT 7%",
  payment_cash: "Payment — Cash",
  payment_scan: "Payment — Scan/QR",
  payment_credit_card: "Payment — Card",
};

const MANUAL_FIELDS = [
  "exp_staff_food_cash",
  "exp_drinks_cash",
  "exp_goodies_cash",
  "exp_animals_cash",
  "exp_supply_cash",
  "exp_boss_fees_cash",
  "exp_other_cash",
  "exp_makro_bank",
  "exp_other_bank",
  "hr_salary_cash",
  "hr_salary_bank",
  "hr_challenge_cash",
  "hr_service_charge_cash",
  "hr_accompte_cash",
  "cash_end_day",
  "cash_to_boss",
  "cash_safe",
];

function emptyProposed(): ProposedDailyEntry {
  return {
    sales_drinks_net: 0,
    sales_ticket_net: 0,
    sales_snack_net: 0,
    sales_goodies_net: 0,
    sales_card_surcharge: 0,
    vat_7: 0,
    payment_cash: 0,
    payment_scan: 0,
    payment_credit_card: 0,
  };
}

function receiptLocalDate(receipt: LoyverseReceipt): string {
  const raw = receipt.receipt_date ?? receipt.created_at ?? "";
  return raw.slice(0, 10);
}

function isSameDay(receipt: LoyverseReceipt, date: string): boolean {
  return receiptLocalDate(receipt) === date;
}

function signedMultiplier(receipt: LoyverseReceipt): number {
  if (receipt.cancelled_at) return 0;
  return receipt.receipt_type === "REFUND" ? -1 : 1;
}

export function buildItemCategoryMap(items: LoyverseItem[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const item of items) {
    map.set(item.id, item.category_id ?? null);
  }
  return map;
}

export function aggregateReceipts(
  receipts: LoyverseReceipt[],
  date: string,
  storeId: string,
  itemCategoryMap: Map<string, string | null>,
  categoryNames: Map<string, string>,
): {
  proposed: ProposedDailyEntry;
  challenges: ProposedChallengeEntry;
  meta: AggregationMeta;
} {
  const proposed = emptyProposed();
  const meta: AggregationMeta = {
    receipt_count: 0,
    sale_count: 0,
    refund_count: 0,
    cancelled_count: 0,
    unmapped_line_items: 0,
    unmapped_payments: 0,
  };
  let snacksSold = 0;

  const dayReceipts = receipts.filter(
    (r) => r.store_id === storeId && isSameDay(r, date),
  );

  for (const receipt of dayReceipts) {
    if (receipt.cancelled_at) {
      meta.cancelled_count++;
      continue;
    }

    meta.receipt_count++;
    const mult = signedMultiplier(receipt);
    if (receipt.receipt_type === "REFUND") {
      meta.refund_count++;
    } else {
      meta.sale_count++;
    }

    proposed.vat_7 += (receipt.total_tax ?? 0) * mult;
    proposed.sales_card_surcharge += (receipt.surcharge ?? 0) * mult;

    for (const line of receipt.line_items ?? []) {
      const categoryId = line.item_id ? itemCategoryMap.get(line.item_id) ?? null : null;
      const categoryName = categoryId ? categoryNames.get(categoryId) ?? null : null;
      const bucket = resolveSalesBucket(categoryId, categoryName, line.item_name ?? null);
      const amount = (line.total_money ?? 0) * mult;

      switch (bucket) {
        case "drinks":
          proposed.sales_drinks_net += amount;
          break;
        case "ticket":
          proposed.sales_ticket_net += amount;
          break;
        case "snack":
          proposed.sales_snack_net += amount;
          snacksSold += (line.quantity ?? 0) * mult;
          break;
        case "goodies":
          proposed.sales_goodies_net += amount;
          break;
        default:
          meta.unmapped_line_items++;
          break;
      }
    }

    for (const payment of receipt.payments ?? []) {
      const bucket = resolvePaymentBucket(payment.type ?? null, payment.name ?? null);
      const amount = (payment.money_amount ?? 0) * mult;
      switch (bucket) {
        case "cash":
          proposed.payment_cash += amount;
          break;
        case "scan":
          proposed.payment_scan += amount;
          break;
        case "credit_card":
          proposed.payment_credit_card += amount;
          break;
        default:
          meta.unmapped_payments++;
          break;
      }
    }
  }

  return {
    proposed,
    challenges: {
      entry_count: meta.sale_count - meta.refund_count,
      snacks_sold: Math.max(0, Math.round(snacksSold)),
    },
    meta,
  };
}

export function computeCoverage(): CoverageResult {
  return {
    auto_fillable_count: AUTO_FILLABLE_FIELDS.length,
    total_trackable: AUTO_FILLABLE_FIELDS.length + MANUAL_FIELDS.length,
    percent: Math.round((AUTO_FILLABLE_FIELDS.length / (AUTO_FILLABLE_FIELDS.length + MANUAL_FIELDS.length)) * 100),
    auto_fillable_fields: [...AUTO_FILLABLE_FIELDS],
    manual_fields: MANUAL_FIELDS,
  };
}

export function buildFieldDiffs(
  proposed: ProposedDailyEntry,
  existing: Record<string, number | string | null> | null,
): FieldDiff[] {
  return AUTO_FILLABLE_FIELDS.map((field) => {
    const proposedVal = proposed[field];
    const existingRaw = existing?.[field];
    const existingVal =
      existingRaw === null || existingRaw === undefined
        ? null
        : typeof existingRaw === "number"
          ? existingRaw
          : parseFloat(String(existingRaw)) || 0;
    const delta = existingVal === null ? null : proposedVal - existingVal;
    return {
      field,
      label: FIELD_LABELS[field] ?? field,
      proposed: proposedVal,
      existing: existingVal,
      delta,
      auto_fillable: true,
    };
  });
}

export function dateRangeForDay(date: string): { created_at_min: string; created_at_max: string } {
  return {
    created_at_min: `${date}T00:00:00.000Z`,
    created_at_max: `${date}T23:59:59.999Z`,
  };
}

export function lastNDates(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
