"use client";
import { Stat } from "@/components/ui/stat";
import {
  salesNetTotal,
  expTotal,
  hrTotal,
  type DailyEntry,
} from "@/modules/accounting/types";

interface Props {
  entry?: DailyEntry;
  cashSafe?: number;
}

function thb(n: number): string {
  if (n === 0) return "—";
  return (n < 0 ? "−" : "") + "฿" + Math.round(Math.abs(n)).toLocaleString("en");
}

export function DaySummaryCards({ entry, cashSafe }: Props) {
  const hasEntry = !!entry;
  const sales    = entry ? salesNetTotal(entry) : 0;
  const payments = entry ? entry.payment_cash + entry.payment_scan + entry.payment_credit_card : 0;
  const expenses = entry ? expTotal(entry) : 0;
  const hr       = entry ? hrTotal(entry) : 0;
  const net      = sales - expenses - hr;

  const stats = [
    { label: "Sales", value: thb(sales) },
    { label: "Payments", value: thb(payments) },
    { label: "Expenses", value: thb(expenses) },
    { label: "HR", value: thb(hr) },
    {
      label: "Net",
      value: thb(net),
      deltaDir: hasEntry ? (net > 0 ? ("up" as const) : net < 0 ? ("down" as const) : ("neutral" as const)) : ("neutral" as const),
    },
    { label: "Cash safe", value: thb(cashSafe ?? 0) },
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