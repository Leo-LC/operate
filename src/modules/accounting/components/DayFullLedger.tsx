"use client";
import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { DAILY_ENTRY_SECTIONS, resolveField } from "@/modules/accounting/config";
import type { DailyEntry } from "@/modules/accounting/types";

interface Props {
  date: string;
  entry?: DailyEntry;
}

function fmt(n: number): string {
  if (n === 0) return "—";
  return "฿" + Math.round(n).toLocaleString("en");
}

function SectionBlock({ entry, section }: { entry?: DailyEntry; section: (typeof DAILY_ENTRY_SECTIONS)[number] }) {
  const [open, setOpen] = useState(true);
  const fields = section.fields;

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--surface)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px var(--s-4)",
          background: section.headerBg,
          color: section.headerColor,
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {open ? <ChevronDownIcon style={{ width: 13, height: 13 }} /> : <ChevronRightIcon style={{ width: 13, height: 13 }} />}
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{section.label}</span>
        {entry && (
          <span className="mono tabular-nums" style={{ marginLeft: "auto", fontSize: 12, opacity: 0.9 }}>
            {section.id === "treasury"
              ? fmt(resolveField(entry, "cash_safe"))
              : section.id === "sales"
                ? fmt(resolveField(entry, "__sales_net__"))
                : section.id === "payments"
                  ? fmt(entry.payment_cash + entry.payment_scan + entry.payment_credit_card)
                  : section.id === "expenses"
                    ? fmt(resolveField(entry, "__exp_total__"))
                    : fmt(resolveField(entry, "__hr_total__"))}
          </span>
        )}
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {fields.map((f) => {
            const value = entry ? resolveField(entry, f.key) : 0;
            const isTotal = f.calculated;
            return (
              <div
                key={f.key as string}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "7px var(--s-4)",
                  borderTop: "1px solid var(--line-2)",
                  background: isTotal ? "var(--bg-2)" : "transparent",
                }}
              >
                <span style={{ fontSize: 12, color: isTotal ? "var(--fg-2)" : "var(--fg-3)", fontWeight: isTotal ? 500 : 400 }}>
                  {f.label}
                  {isTotal && <span style={{ color: "var(--fg-4)", fontSize: 10, fontStyle: "italic", marginLeft: 6 }}>calculated</span>}
                </span>
                <span
                  className="mono tabular-nums"
                  style={{
                    fontSize: 12,
                    fontWeight: isTotal ? 600 : 400,
                    color: entry ? (isTotal ? "var(--fg)" : "var(--fg)") : "var(--fg-4)",
                  }}
                >
                  {entry ? fmt(value) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DayFullLedger({ date, entry }: Props) {
  const allZero = useMemo(
    () => !entry || DAILY_ENTRY_SECTIONS.every((s) => s.fields.every((f) => resolveField(entry, f.key) === 0)),
    [entry],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Full ledger</div>
        <div className="mono tabular-nums" style={{ fontSize: 12, color: "var(--fg-4)" }}>{date}</div>
      </div>
      {allZero ? (
        <div style={{ padding: "var(--s-4)", borderRadius: "var(--r-md)", background: "var(--bg-2)", border: "1px solid var(--line)", fontSize: 13, color: "var(--fg-4)", textAlign: "center" }}>
          No entry recorded for this day.
        </div>
      ) : (
        DAILY_ENTRY_SECTIONS.map((s) => <SectionBlock key={s.id} entry={entry} section={s} />)
      )}
    </div>
  );
}