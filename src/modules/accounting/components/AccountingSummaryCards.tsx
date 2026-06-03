"use client";
import { Stat } from "@/components/ui/stat";
import {
  salesNetTotal,
  expCashTotal,
  expBankTotal,
  hrTotal,
  type DailyEntry,
} from "@/modules/accounting/types";

interface Props {
  entries: DailyEntry[];
  daysInMonth?: number;
  today?: Date;
  month?: number;
  year?: number;
}

function thb(n: number): string {
  if (n === 0) return "—";
  return (n < 0 ? "−" : "") + "฿" + Math.round(Math.abs(n)).toLocaleString("en");
}

export function AccountingSummaryCards({ entries }: Props) {
  const totals = entries.reduce(
    (acc, e) => ({
      salesNet: acc.salesNet + salesNetTotal(e),
      opex:     acc.opex     + expCashTotal(e) + expBankTotal(e),
      hr:       acc.hr       + hrTotal(e),
      vat:      acc.vat      + e.vat_7,
    }),
    { salesNet: 0, opex: 0, hr: 0, vat: 0 },
  );

  const netAfterOpex  = totals.salesNet - totals.opex;
  const totalCosts    = totals.opex + totals.hr;

  const stats = [
    {
      label: "Sales",
      value: thb(totals.salesNet),
    },
    {
      label: "OpEx",
      value: thb(totals.opex),
    },
    {
      label: "Net after OpEx",
      value: thb(netAfterOpex),
      deltaDir: netAfterOpex > 0 ? "up" as const : netAfterOpex < 0 ? "down" as const : "neutral" as const,
    },
    {
      label: "HR",
      value: thb(totals.hr),
    },
    {
      label: "VAT 7%",
      value: thb(totals.vat),
    },
    {
      label: "Total costs",
      value: thb(totalCosts),
      deltaDir: "neutral" as const,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "var(--s-3)" }}>
      {stats.map(({ label, value, deltaDir }) => (
        <div
          key={label}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            padding: "var(--s-4)",
          }}
        >
          <Stat label={label} value={value} deltaDir={deltaDir} />
        </div>
      ))}
    </div>
  );
}
