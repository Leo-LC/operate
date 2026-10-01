import { describe, expect, it } from "vitest";
import {
  isZeroDiff,
  summarizeCashControl,
  summarizeCashMovements,
  summarizePayments,
  summarizeSales,
} from "./shift-summary";

const SHIFT = {
  gross_sales: 19916.1,
  discounts: 0,
  refunds: 0,
  net_sales: 19916.1,
  surcharge: 0,
  taxes: [{ tax_id: "t1", money_amount: 1178.61 }],
  starting_cash: 4000,
  cash_payments: 14145,
  cash_refunds: 0,
  paid_in: 0,
  paid_out: 1252,
  expected_cash: 16893,
  actual_cash: 16893,
  payments: [
    { payment_type_id: "cash-id", money_amount: 14145 },
    { payment_type_id: "qr-id", money_amount: 2300 },
    { payment_type_id: "card-id", money_amount: 3471.1 },
  ],
  cash_movements: [
    { type: "PAY_OUT", money_amount: 193, comment: "Fresh milk" },
    { type: "PAY_OUT", money_amount: 175, comment: "Ice" },
  ],
};

describe("summarizeSales", () => {
  it("agrège les totaux et la somme des taxes", () => {
    const s = summarizeSales([SHIFT]);
    expect(s.gross_sales).toBeCloseTo(19916.1);
    expect(s.net_sales).toBeCloseTo(19916.1);
    expect(s.taxes).toBeCloseTo(1178.61);
    expect(s.discounts).toBe(0);
  });
  it("retourne null pour les clés absentes (aucune ligne inventée)", () => {
    const s = summarizeSales([{}]);
    expect(s.gross_sales).toBeNull();
    expect(s.taxes).toBeNull();
  });
});

describe("summarizePayments", () => {
  it("agrège par moyen de paiement avec le nom résolu", () => {
    const map = new Map([["cash-id", "Cash"], ["qr-id", "PromptPay"], ["card-id", "Visa"]]);
    const lines = summarizePayments([SHIFT], map);
    expect(lines).toHaveLength(3);
    expect(lines.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(19916.1);
    expect(lines[0]?.label).toBe("Cash");
  });
});

describe("summarizeCashControl", () => {
  it("calcule l'écart counted − expected", () => {
    const c = summarizeCashControl([SHIFT]);
    expect(c.expected_cash).toBe(16893);
    expect(c.difference).toBe(0);
    expect(isZeroDiff(c.difference)).toBe(true);
    expect(isZeroDiff(1.5)).toBe(false);
  });
});

describe("summarizeCashMovements", () => {
  it("traduit PAY_OUT en Sortie avec le motif", () => {
    const m = summarizeCashMovements([SHIFT]);
    expect(m).toHaveLength(2);
    expect(m[0]).toMatchObject({ label: "Sortie", reason: "Fresh milk", amount: 193 });
  });
});
