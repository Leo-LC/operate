"use client";
import { Stat } from "@/components/ui/stat";
import {
  salesNetTotal,
  expCashTotal,
  expBankTotal,
  hrTotal,
  fixedExpenseTotal,
  type DailyEntry,
  type MonthlyFixedExpense,
} from "@/modules/accounting/types";

interface Props {
  entries: DailyEntry[];
  fixedCost?: MonthlyFixedExpense | null;
  daysInMonth?: number;
  today?: Date;
  month?: number;
  year?: number;
}

function thb(n: number): string {
  if (n === 0) return "—";
  return (n < 0 ? "−" : "") + "฿" + Math.round(Math.abs(n)).toLocaleString("en");
}

export function AccountingSummaryCards({ entries, fixedCost }: Props) {
  const totals = entries.reduce(
    (acc, e) => ({
      salesNet: acc.salesNet + salesNetTotal(e),
      opex:     acc.opex     + expCashTotal(e) + expBankTotal(e),
      hr:       acc.hr       + hrTotal(e),
    }),
    { salesNet: 0, opex: 0, hr: 0 },
  );

  const fixed       = fixedCost ? fixedExpenseTotal(fixedCost) : 0;
  const totalCosts  = totals.opex + totals.hr + fixed;
  const whatsLeft   = totals.salesNet - totalCosts;

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
      label: "HR",
      value: thb(totals.hr),
    },
    {
      label: "Total costs",
      value: thb(totalCosts),
    },
    {
      label: "What's left",
      value: thb(whatsLeft),
      deltaDir: whatsLeft > 0 ? "up" as const : whatsLeft < 0 ? "down" as const : "neutral" as const,
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
