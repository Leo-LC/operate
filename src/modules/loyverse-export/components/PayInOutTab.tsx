"use client";

import * as React from "react";
import { formatDateDDMMYYYY, formatDisplayAmount } from "@/modules/loyverse/lib/accounting-copy";
import { summarizeCashMovements, type CashMovementLine } from "@/modules/loyverse/lib/shift-summary";
import type { ShiftRow } from "./LoyverseExportClient";

interface DayPay {
  date: string;
  payIn: CashMovementLine[];
  payOut: CashMovementLine[];
  totalIn: number;
  totalOut: number;
  hasData: boolean;
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
  const rows: DayPay[] = React.useMemo(() => {
    return days.map((date) => {
      const dayRows = shiftRows.filter((r) => r.store_id === selectedStore && r.date === date);
      const hasData = dayRows.length > 0;
      const shifts = dayRows.flatMap((r) => (Array.isArray(r.shifts) ? r.shifts : []) as Record<string, unknown>[]);
      const movements = hasData ? summarizeCashMovements(shifts) : [];
      // "other" kinds (unexpected Loyverse types) are shown under Pay out with
      // their raw label so no movement is ever hidden; totals only sum IN/OUT.
      const payIn = movements.filter((m) => m.kind === "in");
      const payOut = movements.filter((m) => m.kind !== "in");
      let totalIn = 0;
      let totalOut = 0;
      for (const m of payIn) totalIn += m.amount;
      for (const m of movements) if (m.kind === "out") totalOut += m.amount;
      return { date, payIn, payOut, totalIn, totalOut, hasData };
    });
  }, [days, shiftRows, selectedStore]);

  const movementCount = rows.reduce((a, r) => a + r.payIn.length + r.payOut.length, 0);
  const totalInAll = rows.reduce((a, r) => a + r.totalIn, 0);
  const totalOutAll = rows.reduce((a, r) => a + r.totalOut, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
      <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>
        Pay in / Pay out Loyverse — {movementCount} mouvement{movementCount > 1 ? "s" : ""} sur la plage
        {` · OUT ${formatDisplayAmount(totalOutAll)} · IN ${formatDisplayAmount(totalInAll)}`}.
      </p>

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
              {rows.map(({ date, payIn, payOut, hasData }) => (
                <tr key={date} style={{ borderTop: "1px solid var(--line)", background: hasData ? "var(--surface)" : "var(--bg-2)", opacity: hasData ? 1 : 0.75 }}>
                  <td className="mono tabular-nums" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontWeight: 500, verticalAlign: "top" }}>
                    {formatDateDDMMYYYY(date)}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
