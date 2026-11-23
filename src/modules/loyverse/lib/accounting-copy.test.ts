import { describe, expect, it } from "vitest";
import {
  buildAccountingValues,
  buildAccountingValuesFromShifts,
  buildCopyLine,
  buildCopyText,
  formatCopyNumber,
  formatDisplayAmount,
  formatDisplayNumber,
  VISIBLE_COLUMNS,
  formatDateDDMMYYYY,
} from "./accounting-copy";

describe("accounting-copy", () => {
  it("builds a single-day line in VISIBLE_COLUMNS order", () => {
    const values = buildAccountingValues(
      null,
      {
        sales_drinks_net: 1000,
        sales_ticket_net: 200,
        sales_snack_net: 50,
        sales_goodies_net: 0,
        sales_card_surcharge: 10,
        vat_7: 80,
        payment_cash: 500,
        payment_scan: 400,
        payment_credit_card: 360,
      },
      "2026-09-20",
      new Map(),
    );
    const line = buildCopyLine(values);
    const cols = line.split("\t");
    expect(cols.length).toBe((VISIBLE_COLUMNS as unknown as string[]).length);
    // visible order starts at drinks, no date column in copied text
    expect(cols[0]).toBe("1000");
    expect(cols[1]).toBe("200");
    expect(line).not.toContain("2026-09-20");
  });

  it("joins multi-day lines with newlines", () => {
    const text = buildCopyText(["a\tb", "c\td"]);
    expect(text).toBe("a\tb\nc\td");
  });

  it("formats dates as DD MM YYYY", () => {
    expect(formatDateDDMMYYYY("2026-09-20")).toBe("20 09 2026");
  });
});

describe("overnight / incoherent shifts — Karon 22/23 Sept", () => {
  const snapshot = {
    sales_drinks_net: 5000,
    sales_ticket_net: 3000,
    sales_snack_net: 100,
    sales_goodies_net: 0,
    sales_card_surcharge: 0,
    vat_7: 400,
    payment_cash: 6000,
    payment_scan: 1000,
    payment_credit_card: 1100,
  };
  const paymentMap = new Map([["cash-id", "Cash"]]);
  const mkShift = (opened: string, closed: string, cash: number) => ({
    opened_at: opened,
    closed_at: closed,
    surcharge: 0,
    taxes: [{ money_amount: 10 }],
    payments: [{ payment_type_id: "cash-id", type: "cash", name: "Cash", money_amount: cash }],
  });

  it("falls back to snapshot payments when a shift spans midnight", () => {
    const day = mkShift("2026-09-22T02:04:00.000Z", "2026-09-22T13:45:00.000Z", 6000);
    const overnight = mkShift("2026-09-22T13:45:00.000Z", "2026-09-23T13:53:00.000Z", 99999);
    const { values, warning, paymentsFromSnapshot } = buildAccountingValuesFromShifts(
      [day, overnight],
      snapshot,
      "2026-09-22",
      paymentMap,
    );
    expect(paymentsFromSnapshot).toBe(true);
    expect(values["payment_cash"]).toBe("6000"); // snapshot, not 99999
    expect(warning).toContain("incohérent");
  });

  it("aggregates ALL same-day shifts (no more shifts[0]-only)", () => {
    const a = mkShift("2026-09-22T02:00:00.000Z", "2026-09-22T06:00:00.000Z", 1000);
    const b = mkShift("2026-09-22T07:00:00.000Z", "2026-09-22T13:00:00.000Z", 2000);
    const { values, warning } = buildAccountingValuesFromShifts([a, b], snapshot, "2026-09-22", paymentMap);
    expect(warning).toBeNull();
    expect(values["payment_cash"]).toBe("3000");
  });
});

describe("POS-swap legacy payment types — Phangan 9–17 Nov", () => {
  const snapshot = {
    sales_drinks_net: 5000,
    sales_ticket_net: 3811,
    sales_snack_net: 0,
    sales_goodies_net: 0,
    sales_card_surcharge: 0,
    vat_7: 616,
    payment_cash: 3650,
    payment_scan: 0,
    payment_credit_card: 5161,
  };
  // ids recréés lors du swap de POS : absents de la liste live des payment types
  const legacyCash = "1854f7dc-b7fc-4744-b1f7-2ac18b128b01";
  const legacyCard = "8356782f-c02c-4d46-a6c0-9fa929e8b3db";
  const unknownId = "00000000-0000-0000-0000-000000000000";
  const mkShift = (payments: { payment_type_id: string; money_amount: number }[]) => ({
    opened_at: "2026-11-09T02:32:19.000Z",
    closed_at: "2026-11-09T14:11:45.000Z",
    surcharge: 0,
    taxes: [{ money_amount: 10 }],
    payments,
  });

  it("buckets legacy payment type ids via the alias table", () => {
    const { values, paymentsFromSnapshot } = buildAccountingValuesFromShifts(
      [mkShift([
        { payment_type_id: legacyCash, money_amount: 3650 },
        { payment_type_id: legacyCard, money_amount: 5161 },
      ])],
      snapshot,
      "2026-11-09",
      new Map(), // paymentMap vide : le nom des ids legacy n'est pas fetchable
    );
    expect(values["payment_cash"]).toBe("3650");
    expect(values["payment_credit_card"]).toBe("5161");
    expect(values["payment_scan"]).toBe("0");
    expect(paymentsFromSnapshot).toBe(false);
  });

  it("falls back to snapshot payments when a shift payment id is unknown", () => {
    const { values, paymentsFromSnapshot } = buildAccountingValuesFromShifts(
      [mkShift([{ payment_type_id: unknownId, money_amount: 12345 }])],
      snapshot,
      "2026-11-09",
      new Map(),
    );
    expect(paymentsFromSnapshot).toBe(true);
    expect(values["payment_cash"]).toBe("3650"); // snapshot, not 12345
    expect(values["payment_credit_card"]).toBe("5161");
  });
});

describe("thousands separator — display formatted, copy raw", () => {
  it("formats 1000000 as 1,000,000 for display", () => {
    expect(formatDisplayNumber("1000000")).toBe("1,000,000");
    expect(formatDisplayAmount(1000000)).toBe("1,000,000");
  });

  it("keeps the clipboard value raw (no separator)", () => {
    expect(formatCopyNumber(1000000)).toBe("1000000");
    const line = buildCopyLine({
      sales_drinks_net: formatCopyNumber(1000000),
      sales_ticket_net: "0",
      sales_snack_net: "",
      sales_goodies_net: "",
      sales_card_surcharge: "",
      sales_net_inc_vat: "",
      vat_7: "",
      payment_cash: "",
      payment_scan: "",
      payment_credit_card: "",
    });
    expect(line.split("\t")[0]).toBe("1000000");
  });

  it("handles decimals, zero and empty", () => {
    expect(formatDisplayNumber("1234567.5")).toBe("1,234,567.5");
    expect(formatDisplayNumber("")).toBe("");
    expect(formatDisplayAmount(0)).toBe("0");
    expect(formatDisplayAmount(NaN)).toBe("—");
  });
});
