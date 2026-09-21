import { describe, it, expect } from "vitest";
import {
  buildAccountingValues,
  buildCopyLine,
  buildCopyText,
  VISIBLE_COLUMNS,
  formatDateDDMMYYYY,
} from "@/modules/loyverse/lib/accounting-copy";

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

  it("returns empty values when no shift and no snapshot", () => {
    const values = buildAccountingValues(null, null, "2026-09-20", new Map());
    expect(values["date"]).toBe("2026-09-20");
    expect(buildCopyLine(values)).toBe(
      (VISIBLE_COLUMNS as unknown as string[]).map(() => "").join("\t"),
    );
  });

  it("formats date DD MM YYYY for display", () => {
    expect(formatDateDDMMYYYY("2026-09-05")).toBe("05 09 2026");
  });
});
