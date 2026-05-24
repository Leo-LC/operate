"use client";
import { Stat } from "@/components/ui/stat";
import {
  salesNetTotal,
  expCashTotal,
  expBankTotal,
  hrTotal,
  paymentDelta,
  type DailyEntry,
} from "@/modules/accounting/types";

interface Props {
  entries: DailyEntry[];
  daysInMonth: number;
  today: Date;
  month: number;
  year: number;
}

function thb(n: number): string {
  if (n === 0) return "—";
  return (n < 0 ? "−" : "") + "฿" + Math.round(Math.abs(n)).toLocaleString("en");
}

function fmtSigned(n: number): string {
  if (n === 0) return "—";
  return (n > 0 ? "+" : "−") + "฿" + Math.round(Math.abs(n)).toLocaleString("en");
}

export function AccountingSummaryCards({ entries, daysInMonth, today, month, year }: Props) {
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth;

  const totals = entries.reduce(
    (acc, e) => ({
      salesNet:   acc.salesNet   + salesNetTotal(e),
      payDelta:   acc.payDelta   + paymentDelta(e),
      expCash:    acc.expCash    + expCashTotal(e),
      expBank:    acc.expBank    + expBankTotal(e),
      hr:         acc.hr         + hrTotal(e),
      cashToBoss: acc.cashToBoss + e.cash_to_boss,
    }),
    { salesNet: 0, payDelta: 0, expCash: 0, expBank: 0, hr: 0, cashToBoss: 0 },
  );

  const filled    = entries.length;
  const filledLow = filled < daysPassed;
  const deltaFlag = Math.abs(totals.payDelta) > 10;

  const stats = [
    {
      label: "Sales total",
      value: thb(totals.salesNet),
      deltaDir: undefined as "up" | "down" | "neutral" | undefined,
    },
    {
      label: "Payment delta",
      value: fmtSigned(totals.payDelta),
      deltaDir: deltaFlag ? "down" as const : totals.payDelta === 0 ? "neutral" as const : "up" as const,
      hint: deltaFlag ? "Mismatch — check entries" : undefined,
    },
    {
      label: "Cash expenses",
      value: thb(totals.expCash),
    },
    {
      label: "Bank expenses",
      value: thb(totals.expBank),
    },
    {
      label: "HR total",
      value: thb(totals.hr),
    },
    {
      label: "Cash to boss",
      value: thb(totals.cashToBoss),
    },
    {
      label: "Days filled",
      value: `${filled} / ${daysInMonth}`,
      deltaDir: filledLow ? "down" as const : "up" as const,
      hint: filledLow ? `${daysPassed - filled} days missing` : undefined,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "var(--s-3)" }}>
      {stats.map(({ label, value, deltaDir, hint }) => (
        <div
          key={label}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            padding: "var(--s-4)",
          }}
        >
          <Stat label={label} value={value} deltaDir={deltaDir} hint={hint} />
        </div>
      ))}
    </div>
  );
}
