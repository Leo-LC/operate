import { describe, expect, it } from "vitest";
import {
  buildAccountingValues,
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
