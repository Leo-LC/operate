"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  COMPUTED_COLS,
  COLUMN_LABELS,
  VISIBLE_COLUMNS,
  buildAccountingValuesFromShifts,
  buildCopyLine,
  buildCopyText,
  formatDateDDMMYYYY,
  formatDisplayNumber,
  type SnapshotLike,
} from "@/modules/loyverse/lib/accounting-copy";
import type { ShiftRow, SnapshotRow } from "./LoyverseExportClient";

const VISIBLE = VISIBLE_COLUMNS as unknown as string[];

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

interface Props {
  days: string[];
  selectedStore: string | null;
  shiftRows: ShiftRow[];
  snapshotRows: SnapshotRow[];
  paymentMap: Map<string, string>;
  loading: boolean;
}

export function ExportCopyTab({ days, selectedStore, shiftRows, snapshotRows, paymentMap, loading }: Props) {
  const [copiedAll, setCopiedAll] = React.useState(false);
  const [copiedDay, setCopiedDay] = React.useState<string | null>(null);

  const shiftByDate = React.useMemo(() => {
    const m = new Map<string, ShiftRow[]>();
    for (const r of shiftRows) {
      if (r.store_id !== selectedStore) continue;
      const arr = m.get(r.date) ?? [];
      arr.push(r);
      m.set(r.date, arr);
    }
    return m;
  }, [shiftRows, selectedStore]);

  const snapshotByDate = React.useMemo(() => {
    const m = new Map<string, SnapshotRow>();
    for (const r of snapshotRows) {
      if (r.store_id !== selectedStore) continue;
      if (!m.has(r.date)) m.set(r.date, r);
    }
    return m;
  }, [snapshotRows, selectedStore]);

  const rows = React.useMemo(() => {
    return days.map((date) => {
      const sRows = shiftByDate.get(date) ?? [];
      const snapshot: SnapshotLike | null = snapshotByDate.get(date) ?? null;
      // Aggregate ALL shifts of the day (a day can have several shifts); the
      // shared builder falls back to the receipt-based snapshot when a shift
      // is incoherent (e.g. spans midnight after a bad reopen).
      const allShifts = sRows.flatMap((r) => (Array.isArray(r.shifts) ? r.shifts : []) as Record<string, unknown>[]);
      const { values, warning, paymentsFromSnapshot } = buildAccountingValuesFromShifts(allShifts, snapshot, date, paymentMap);
      const rawShift = allShifts[0] as Record<string, unknown> | undefined ?? null;
      void rawShift;
      return { date, values, line: buildCopyLine(values), hasData: Boolean(allShifts.length > 0 || snapshot), warning, paymentsFromSnapshot };
    });
  }, [days, shiftByDate, snapshotByDate, paymentMap]);

  const dataRows = rows.filter((r) => r.hasData);
  const missingCount = rows.length - dataRows.length;
  const warnedRows = rows.filter((r) => r.warning);

  async function handleCopyAll() {
    if (dataRows.length === 0) return;
    await copyToClipboard(buildCopyText(dataRows.map((r) => r.line)));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  }

  async function handleCopyDay(date: string, line: string) {
    await copyToClipboard(line);
    setCopiedDay(date);
    setTimeout(() => setCopiedDay(null), 1800);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s-3)", flexWrap: "wrap" }}>
        <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>
          Données Loyverse à copier dans Accounting — même ordre que Shift &amp; Sales (tabulations, une ligne par jour).
        </p>
        <Button size="sm" onClick={handleCopyAll} disabled={dataRows.length === 0}>
          {copiedAll ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
          {copiedAll ? "copié" : `copier ${dataRows.length} ligne${dataRows.length > 1 ? "s" : ""}`}
        </Button>
      </div>

      {warnedRows.length > 0 && selectedStore && !loading && (
        <div style={{ borderRadius: "var(--r-sm)", border: "1px solid var(--warn)", background: "var(--warn-soft)", padding: "8px 12px", fontSize: 12, color: "var(--warn)" }}>
          ⚠️ Shift incohérent détecté ({warnedRows.map((r) => formatDateDDMMYYYY(r.date)).join(", ")}) — paiements affichés depuis les reçus, pas depuis le shift. Vérifiez la fermeture en caisse avant de copier.
        </div>
      )}

      {!selectedStore ? (
        <p style={{ fontSize: 13, color: "var(--fg-4)", textAlign: "center", padding: "24px 0" }}>
          Sélectionne un shop ci-dessus.
        </p>
      ) : loading ? (        <div className="animate-pulse" style={{ height: 120, borderRadius: "var(--r-md)", background: "var(--line-2)" }} />
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
                {VISIBLE.map((c) => (
                  <th key={c} title={c} style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "left", fontWeight: 500 }}>
                    {COLUMN_LABELS[c] ?? c}
                    {COMPUTED_COLS.has(c) ? " *" : ""}
                  </th>
                ))}
                <th style={{ whiteSpace: "nowrap", padding: "8px 10px", textAlign: "right", fontWeight: 500 }}>Copier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ date, values, line, hasData, warning, paymentsFromSnapshot }) => (
                <tr key={date} style={{ borderTop: "1px solid var(--line)", background: hasData ? "var(--surface)" : "var(--bg-2)", opacity: hasData ? 1 : 0.75 }}>
                  <td className="mono tabular-nums" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontWeight: 500 }}>
                    {formatDateDDMMYYYY(date)}
                    {warning ? (
                      <span title={`${warning}${paymentsFromSnapshot ? " (paiements depuis les reçus)" : ""}`} style={{ marginLeft: 6, fontSize: 11 }} role="img" aria-label="shift incohérent">
                        ⚠️
                      </span>
                    ) : null}
                  </td>
                  {VISIBLE.map((c) => {
                    const v = values[c] ?? "";
                    const isComputed = COMPUTED_COLS.has(c);
                    const isEmpty = v === "";
                    return (
                      <td
                        key={c}
                        className="mono tabular-nums"
                        style={{
                          whiteSpace: "nowrap",
                          padding: "8px 10px",
                          color: isComputed || isEmpty ? "var(--fg-4)" : "var(--fg)",
                          fontWeight: !isComputed && !isEmpty ? 500 : 400,
                        }}
                      >
                        {isEmpty ? "—" : formatDisplayNumber(v)}
                      </td>
                    );
                  })}
                  <td style={{ whiteSpace: "nowrap", padding: "6px 10px", textAlign: "right" }}>
                    {hasData ? (
                      <Button size="sm" variant="secondary" onClick={() => void handleCopyDay(date, line)} title={`Copier la ligne du ${formatDateDDMMYYYY(date)}`}>
                        {copiedDay === date ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                      </Button>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--fg-4)" }}>à synchroniser</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--fg-4)" }}>
          {dataRows.length} jour{dataRows.length > 1 ? "s" : ""} avec données
          {missingCount > 0 ? ` · ${missingCount} jour${missingCount > 1 ? "s" : ""} sans données (synchronise la plage)` : ""} ·
          affichage avec séparateur des milliers, copie brute (sans séparateur) pour Sheets.
        </p>
      )}
    </div>
  );
}
