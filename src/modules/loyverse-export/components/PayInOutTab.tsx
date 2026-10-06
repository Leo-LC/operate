"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { formatDateDDMMYYYY, formatDisplayAmount } from "@/modules/loyverse/lib/accounting-copy";
import { detectDayShiftAnomalies } from "@/modules/loyverse/lib/shift-anomalies";
import { summarizeCashMovements, type CashMovementLine } from "@/modules/loyverse/lib/shift-summary";
import type { ShiftRow } from "./LoyverseExportClient";

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** One CSV row per movement: date,type,reason,raw amount. */
function buildPayMovementCsv(date: string, m: CashMovementLine): string {
  const kind = m.kind === "in" ? "IN" : m.kind === "out" ? "OUT" : "OTHER";
  const amount = Number.isFinite(m.amount) ? String(m.amount) : "";
  return [date, kind, csvCell((m.reason ?? "").trim()), amount].join(",");
}

interface DayPay {
  date: string;
  payIn: CashMovementLine[];
  payOut: CashMovementLine[];
  totalIn: number;
  totalOut: number;
  hasData: boolean;
  shiftWarning: string | null;
}

interface Props {
  days: string[];
  selectedStore: string | null;
  shiftRows: ShiftRow[];
  loading: boolean;
}

function MovementList({ items, emptyLabel }: { items: CashMovementLine[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{emptyLabel}</span>;
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
      {items.map((m, i) => (
        <li
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 10,
            padding: "3px 0",
            borderTop: i > 0 ? "1px solid var(--line-2)" : "none",
          }}
        >
          <span className="mono tabular-nums" style={{ whiteSpace: "nowrap", fontWeight: 500, color: "var(--fg)", textAlign: "right" }}>
            {formatDisplayAmount(m.amount)}
          </span>
          <span style={{ color: "var(--fg-3)" }}>{m.reason}</span>
        </li>
      ))}
    </ul>
  );
}

export function PayInOutTab({ days, selectedStore, shiftRows, loading }: Props) {
  const [copied, setCopied] = React.useState(false);

  const rows: DayPay[] = React.useMemo(() => {
    return days.map((date) => {
      const dayRows = shiftRows.filter((r) => r.store_id === selectedStore && r.date === date);
      const hasData = dayRows.length > 0;
      const shifts = dayRows.flatMap((r) => (Array.isArray(r.shifts) ? r.shifts : []) as Record<string, unknown>[]);
      const movements = hasData ? summarizeCashMovements(shifts) : [];
      const shiftWarning = hasData ? (detectDayShiftAnomalies(shifts, date).warning ?? null) : null;
      // "other" kinds (unexpected Loyverse types) are shown under Pay out with
      // their raw label so no movement is ever hidden; totals only sum IN/OUT.
      const payIn = movements.filter((m) => m.kind === "in");
      const payOut = movements.filter((m) => m.kind !== "in");
      let totalIn = 0;
      let totalOut = 0;
      for (const m of payIn) totalIn += m.amount;
      for (const m of movements) if (m.kind === "out") totalOut += m.amount;
      return { date, payIn, payOut, totalIn, totalOut, hasData, shiftWarning };
    });
  }, [days, shiftRows, selectedStore]);

  const movementCount = rows.reduce((a, r) => a + r.payIn.length + r.payOut.length, 0);

  async function handleCopyCsv() {
    const lines = ["date,type,reason,amount"];
    for (const r of rows) {
      for (const m of [...r.payOut, ...r.payIn]) lines.push(buildPayMovementCsv(r.date, m));
    }
    if (lines.length <= 1) return;
    await copyToClipboard(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--s-3)", flexWrap: "wrap" }}>
        <Button size="sm" variant="secondary" onClick={handleCopyCsv} disabled={movementCount === 0} title="Copier les mouvements en CSV (date,type,motif,montant brut)">
          {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
          {copied ? "copié" : "CSV"}
        </Button>
      </div>

      {!selectedStore ? (
        <p style={{ fontSize: 13, color: "var(--fg-4)", textAlign: "center", padding: "24px 0" }}>
          Sélectionne un shop ci-dessus.
        </p>
      ) : loading ? (
        <div className="animate-pulse" style={{ height: 120, borderRadius: "var(--r-md)", background: "var(--line-2)" }} />
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--fg-4)", textAlign: "center", padding: "24px 0" }}>
          Choisis une plage de dates.
        </p>
      ) : (
        <div style={{ overflow: "auto", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-2)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--fg-4)" }}>
                <th style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "left", fontWeight: 500 }}>Date</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500, borderLeft: "1px solid var(--line-2)" }}>Pay out</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500, borderLeft: "1px solid var(--line-2)" }}>Pay in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ date, payIn, payOut, totalIn, totalOut, hasData, shiftWarning }) => {
                const delta = totalIn - totalOut;
                return (
                <tr key={date} style={{ borderTop: "1px solid var(--line)", background: hasData ? "var(--surface)" : "var(--bg-2)", opacity: hasData ? 1 : 0.75 }}>
                  <td className="mono tabular-nums" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontWeight: 500, verticalAlign: "top" }}>
                    <div>
                    {formatDateDDMMYYYY(date)}
                    {shiftWarning ? (
                      <span title={shiftWarning} style={{ marginLeft: 6, fontSize: 11 }} role="img" aria-label="shift incohérent">
                        ⚠️
                      </span>
                    ) : null}
                    </div>
                    {hasData ? (
                      <div style={{ fontSize: 11, fontWeight: 400, color: "var(--fg-4)", marginTop: 2 }}>
                        Δ {formatDisplayAmount(delta)}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 12, verticalAlign: "top", borderLeft: "1px solid var(--line-2)" }}>
                    {!hasData ? (
                      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>à synchroniser</span>
                    ) : (
                      <MovementList items={payOut} emptyLabel="—" />
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 12, verticalAlign: "top", borderLeft: "1px solid var(--line-2)" }}>
                    {!hasData ? (
                      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>à synchroniser</span>
                    ) : (
                      <MovementList items={payIn} emptyLabel="—" />
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
