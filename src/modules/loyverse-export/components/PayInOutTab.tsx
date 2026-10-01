"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { formatDateDDMMYYYY, formatDisplayAmount } from "@/modules/loyverse/lib/accounting-copy";
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

function rawAmount(m: CashMovementLine): string {
  // Clipboard stays raw (no thousands separator) — same rule as the copy tab.
  return Number.isFinite(m.amount) ? String(m.amount) : "";
}

/** One TSV line per movement: date \t IN|OUT|OTHER \t reason \t raw amount. */
export function buildPayMovementLine(date: string, m: CashMovementLine): string {
  const kind = m.kind === "in" ? "IN" : m.kind === "out" ? "OUT" : "OTHER";
  const reason = (m.reason ?? "").replace(/[\t\r\n]+/g, " ").trim();
  return [date, kind, reason, rawAmount(m)].join("\t");
}

interface DayPay {
  date: string;
  movements: CashMovementLine[];
  totalIn: number;
  totalOut: number;
  copyText: string;
  hasData: boolean;
}

interface Props {
  days: string[];
  selectedStore: string | null;
  shiftRows: ShiftRow[];
  loading: boolean;
}

export function PayInOutTab({ days, selectedStore, shiftRows, loading }: Props) {
  const [copiedAll, setCopiedAll] = React.useState(false);
  const [copiedDay, setCopiedDay] = React.useState<string | null>(null);

  const rows: DayPay[] = React.useMemo(() => {
    return days.map((date) => {
      const dayRows = shiftRows.filter((r) => r.store_id === selectedStore && r.date === date);
      const hasData = dayRows.length > 0;
      const shifts = dayRows.flatMap((r) => (Array.isArray(r.shifts) ? r.shifts : []) as Record<string, unknown>[]);
      const movements = hasData ? summarizeCashMovements(shifts) : [];
      let totalIn = 0;
      let totalOut = 0;
      for (const m of movements) {
        if (m.kind === "in") totalIn += m.amount;
        else if (m.kind === "out") totalOut += m.amount;
      }
      return {
        date,
        movements,
        totalIn,
        totalOut,
        copyText: movements.map((m) => buildPayMovementLine(date, m)).join("\n"),
        hasData,
      };
    });
  }, [days, shiftRows, selectedStore]);

  const dataRows = rows.filter((r) => r.hasData);
  const movementCount = rows.reduce((a, r) => a + r.movements.length, 0);
  const totalInAll = rows.reduce((a, r) => a + r.totalIn, 0);
  const totalOutAll = rows.reduce((a, r) => a + r.totalOut, 0);

  async function handleCopyAll() {
    const text = dataRows
      .filter((r) => r.movements.length > 0)
      .map((r) => r.copyText)
      .join("\n");
    if (!text) return;
    await copyToClipboard(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  }

  async function handleCopyDay(date: string, text: string) {
    if (!text) return;
    await copyToClipboard(text);
    setCopiedDay(date);
    setTimeout(() => setCopiedDay(null), 1800);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s-3)", flexWrap: "wrap" }}>
        <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>
          Pay in / Pay out Loyverse — {movementCount} mouvement{movementCount > 1 ? "s" : ""} sur la plage
          {` · IN ${formatDisplayAmount(totalInAll)} · OUT ${formatDisplayAmount(totalOutAll)} · Net ${formatDisplayAmount(totalInAll - totalOutAll)}`}.
        </p>
        <Button size="sm" onClick={handleCopyAll} disabled={movementCount === 0}>
          {copiedAll ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
          {copiedAll ? "copié" : `copier ${movementCount} mouvement${movementCount > 1 ? "s" : ""}`}
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
                <th style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", fontWeight: 500 }}>Pay in</th>
                <th style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", fontWeight: 500 }}>Pay out</th>
                <th style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", fontWeight: 500 }}>Net</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 500 }}>Détail (motif — montant)</th>
                <th style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", fontWeight: 500 }}>Copier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ date, movements, totalIn, totalOut, copyText, hasData }) => {
                const net = totalIn - totalOut;
                return (
                  <tr key={date} style={{ borderTop: "1px solid var(--line)", background: hasData ? "var(--surface)" : "var(--bg-2)", opacity: hasData ? 1 : 0.75 }}>
                    <td className="mono tabular-nums" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontWeight: 500 }}>
                      {formatDateDDMMYYYY(date)}
                    </td>
                    <td className="mono tabular-nums" style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", color: totalIn > 0 ? "var(--good)" : "var(--fg-4)", fontWeight: totalIn > 0 ? 500 : 400 }}>
                      {hasData ? formatDisplayAmount(totalIn) : "—"}
                    </td>
                    <td className="mono tabular-nums" style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", color: totalOut > 0 ? "var(--bad)" : "var(--fg-4)", fontWeight: totalOut > 0 ? 500 : 400 }}>
                      {hasData ? formatDisplayAmount(totalOut) : "—"}
                    </td>
                    <td className="mono tabular-nums" style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", color: !hasData ? "var(--fg-4)" : net < 0 ? "var(--bad)" : "var(--fg)", fontWeight: 500 }}>
                      {hasData ? formatDisplayAmount(net) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--fg-3)" }}>
                      {!hasData ? (
                        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>à synchroniser</span>
                      ) : movements.length === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>aucun mouvement</span>
                      ) : (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
                          {movements.map((m, i) => (
                            <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                              <span>
                                <span style={{
                                  display: "inline-block", fontSize: 10, fontWeight: 600, padding: "1px 6px",
                                  borderRadius: "var(--r-pill)", marginRight: 6,
                                  color: m.kind === "in" ? "var(--good)" : m.kind === "out" ? "var(--bad)" : "var(--fg-4)",
                                  background: m.kind === "in" ? "var(--good-soft)" : m.kind === "out" ? "var(--bad-soft)" : "var(--bg-2)",
                                }}>
                                  {m.kind === "in" ? "IN" : m.kind === "out" ? "OUT" : m.label}
                                </span>
                                {m.reason}
                              </span>
                              <span className="mono tabular-nums" style={{ whiteSpace: "nowrap", fontWeight: 500, color: "var(--fg)" }}>
                                {formatDisplayAmount(m.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", padding: "6px 10px", textAlign: "right" }}>
                      {movements.length > 0 ? (
                        <Button size="sm" variant="secondary" onClick={() => void handleCopyDay(date, copyText)} title={`Copier les mouvements du ${formatDateDDMMYYYY(date)}`}>
                          {copiedDay === date ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                        </Button>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>—</span>
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
