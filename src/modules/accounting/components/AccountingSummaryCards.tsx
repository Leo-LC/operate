"use client";
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

function fmt(n: number) {
  return n === 0
    ? "—"
    : n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
    { salesNet: 0, payDelta: 0, expCash: 0, expBank: 0, hr: 0, cashToBoss: 0 }
  );

  const filled = entries.length;
  const filledLow = filled < daysPassed;
  const deltaFlag = Math.abs(totals.payDelta) > 10;

  const cards = [
    {
      label: "Sales total",
      value: fmt(totals.salesNet),
      cls: "border-border bg-muted/20",
      valueCls: "",
    },
    {
      label: "Payment delta",
      value: totals.payDelta === 0 ? "—" : (totals.payDelta > 0 ? `+${fmt(totals.payDelta)}` : fmt(totals.payDelta)),
      cls: deltaFlag
        ? "border-destructive/40 bg-destructive/5"
        : "border-border bg-muted/20",
      valueCls: deltaFlag ? "text-destructive" : totals.payDelta === 0 ? "" : "text-green-600 dark:text-green-400",
    },
    {
      label: "Cash expenses",
      value: fmt(totals.expCash),
      cls: "border-border bg-muted/20",
      valueCls: "",
    },
    {
      label: "Bank expenses",
      value: fmt(totals.expBank),
      cls: "border-border bg-muted/20",
      valueCls: "",
    },
    {
      label: "HR total",
      value: fmt(totals.hr),
      cls: "border-border bg-muted/20",
      valueCls: "",
    },
    {
      label: "Cash to boss",
      value: fmt(totals.cashToBoss),
      cls: "border-border bg-muted/20",
      valueCls: "",
    },
    {
      label: "Days filled",
      value: `${filled} / ${daysInMonth}`,
      cls: filledLow
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-border bg-muted/20",
      valueCls: filledLow ? "text-amber-600 dark:text-amber-400" : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map(({ label, value, cls, valueCls }) => (
        <div key={label} className={`rounded-lg border px-4 py-3 ${cls}`}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
          <p className={`text-base font-semibold tabular-nums ${valueCls}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
