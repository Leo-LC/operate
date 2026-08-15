"use client";
import { useState, useMemo } from "react";
import { PencilIcon, HistoryIcon, XIcon, ListIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { DailyEntryModal } from "@/modules/accounting/components/DailyEntryModal";
import { DaySummaryCards } from "@/modules/accounting/components/DaySummaryCards";
import { DayFullLedger } from "@/modules/accounting/components/DayFullLedger";
import { EntryLedgerTable } from "@/modules/accounting/components/EntryLedgerTable";
import {
  toFormState,
  fromFormState,
  salesNetTotal,
  expTotal,
  hrTotal,
  cashEndDayCalc,
  cashSafeCalc,
  type DailyEntry,
  type EntryFormState,
} from "@/modules/accounting/types";
import type { AdminLocation } from "@/modules/admin/types";
import { toast } from "sonner";

function thb(n: number): string {
  if (n === 0) return "—";
  return (n < 0 ? "−" : "") + "฿" + Math.round(Math.abs(n)).toLocaleString("en");
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function weekdayShort(y: number, m: number, d: number) {
  return new Date(y, m - 1, d).toLocaleDateString("en", { weekday: "short" });
}

interface BarProps {
  label: string;
  value: number;
  max: number;
  tone: string;
}

function BreakdownBar({ label, value, max, tone }: BarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: "var(--fg-3)" }}>{label}</span>
        <span className="mono tabular-nums" style={{ fontWeight: 500 }}>{thb(value)}</span>
      </div>
      <div style={{ height: 8, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: tone, borderRadius: 4 }} />
      </div>
    </div>
  );
}

interface AuditLog {
  id: string;
  user_email: string | null;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  year: number;
  month: number;
  entries: DailyEntry[];
  locationId: string;
  locations: AdminLocation[];
  canManage?: boolean;
  onEntryUpdate: (entry: DailyEntry) => void;
  onEntryDelete: (id: string) => void;
}

export function AccountingFocusDay({ year, month, entries, locationId, locations, canManage, onEntryUpdate, onEntryDelete }: Props) {
  const days = daysInMonth(year, month);
  const today = new Date();
  const defaultDay = year === today.getFullYear() && month === today.getMonth() + 1
    ? today.getDate()
    : days;

  const [selectedDay, setSelectedDay]   = useState(defaultDay);
  const [editOpen, setEditOpen]         = useState(false);
  const [modalForm, setModalForm]       = useState<EntryFormState>(toFormState({}));
  const [modalSaving, setModalSaving]   = useState(false);
  const [entryNotes, setEntryNotes]     = useState<Record<string, string>>({});
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [historyLogs, setHistoryLogs]   = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mode, setMode]                 = useState<"day" | "ledger">("day");
  const [fullDetail, setFullDetail]     = useState(false);

  const entryMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const e of entries) m.set(e.entry_date, e);
    return m;
  }, [entries]);

  // Compute cash safe values for all days so the modal can show accurate calcs
  const computedValues = useMemo(() => {
    const map = new Map<string, { cashEndDay: number; cashSafe: number }>();
    let prevSafe = 0;
    for (let day = 1; day <= days; day++) {
      const date = isoDate(year, month, day);
      const entry = entryMap.get(date);
      if (entry) {
        const cashEnd = cashEndDayCalc(entry);
        const safe = entry.cash_safe_is_override
          ? entry.cash_safe
          : cashSafeCalc(cashEnd, prevSafe, entry.cash_to_boss);
        map.set(date, { cashEndDay: cashEnd, cashSafe: safe });
        prevSafe = safe;
      } else {
        map.set(date, { cashEndDay: 0, cashSafe: prevSafe });
      }
    }
    return map;
  }, [days, year, month, entryMap]);

  const entry = entryMap.get(isoDate(year, month, selectedDay));

  const sales    = entry ? salesNetTotal(entry) : 0;
  const expenses = entry ? expTotal(entry) : 0;
  const hr       = entry ? hrTotal(entry) : 0;
  const payments = entry ? entry.payment_cash + entry.payment_scan + entry.payment_credit_card : 0;
  const net      = sales - expenses - hr;

  const allDays = Array.from({ length: days }, (_, i) => i + 1);

  async function openEdit() {
    const date = isoDate(year, month, selectedDay);
    setModalForm(toFormState(entryMap.get(date) ?? {}));
    setPendingNotes({});

    // Fetch existing notes if editing an existing entry
    const existingEntry = entryMap.get(date);
    if (existingEntry?.id) {
      try {
        const res = await fetch(`/api/accounting/entries/${existingEntry.id}/notes`);
        if (res.ok) {
          const json = await res.json() as { notes: Record<string, string> };
          setEntryNotes(json.notes ?? {});
        }
      } catch {
        setEntryNotes({});
      }
    } else {
      setEntryNotes({});
    }

    setEditOpen(true);
  }

  async function handleModalSave(e: React.FormEvent) {
    e.preventDefault();
    setModalSaving(true);
    try {
      const date = isoDate(year, month, selectedDay);
      const fieldVals = fromFormState(modalForm);
      const fakeEntry = { ...fieldVals } as unknown as DailyEntry;
      const cashEnd = cashEndDayCalc(fakeEntry);
      const prevDateKey = selectedDay > 1 ? isoDate(year, month, selectedDay - 1) : null;
      const prevSafe = prevDateKey ? (computedValues.get(prevDateKey)?.cashSafe ?? 0) : 0;
      const safeCash = cashSafeCalc(cashEnd, prevSafe, fakeEntry.cash_to_boss);

      const res = await fetch("/api/accounting/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          entry_date: date,
          ...fieldVals,
          cash_end_day: cashEnd,
          cash_safe: safeCash,
          cash_safe_is_override: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Save failed");
        return;
      }
      const savedEntry = await res.json() as DailyEntry;
      onEntryUpdate(savedEntry);

      // Save any pending field notes (new entries get their ID here)
      const allNotes = { ...entryNotes, ...pendingNotes };
      const noteEntries = Object.entries(allNotes).filter(([, v]) => v.trim() !== "");
      if (noteEntries.length > 0 && savedEntry.id) {
        await Promise.allSettled(
          noteEntries.map(([field, note]) =>
            fetch(`/api/accounting/entries/${savedEntry.id}/notes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ field_name: field, note }),
            })
          )
        );
      }

      setEditOpen(false);
      toast.success("Entry saved");
    } finally {
      setModalSaving(false);
    }
  }

  async function handleModalDelete() {
    const e = entryMap.get(isoDate(year, month, selectedDay));
    if (!e) return;
    const res = await fetch(`/api/accounting/entries/${e.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    onEntryDelete(e.id);
    setEditOpen(false);
    toast.success("Entry deleted");
  }

  async function openHistory() {
    const e = entryMap.get(isoDate(year, month, selectedDay));
    if (!e?.id) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?entity_id=${e.id}`);
      if (!res.ok) { setHistoryLogs([]); return; }
      setHistoryLogs((await res.json() as AuditLog[]));
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  const locationName = locations.find((l) => l.id === locationId)?.name ?? "";
  const selectedComputed = computedValues.get(isoDate(year, month, selectedDay));

  return (
    <div>
      {/* Day / Ledger sub-mode */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s-3)", marginBottom: "var(--s-4)" }}>
        <div style={{ display: "inline-flex", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--bg-2)", padding: 3, gap: 2 }}>
          {([
            { id: "day" as const, label: "Day", icon: EyeIcon },
            { id: "ledger" as const, label: "Ledger", icon: ListIcon },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 28, padding: "0 12px", borderRadius: "var(--r-sm)",
                fontSize: 12, fontWeight: mode === id ? 500 : 400,
                color: mode === id ? "var(--fg)" : "var(--fg-4)",
                background: mode === id ? "var(--surface)" : "transparent",
                border: `1px solid ${mode === id ? "var(--line)" : "transparent"}`,
                boxShadow: mode === id ? "var(--shadow-1)" : "none",
                cursor: "pointer", transition: "all var(--dur) var(--ease)",
              }}
            >
              <Icon size={12} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
        {mode === "day" && (
          <button
            type="button"
            onClick={() => setFullDetail((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              height: 28, padding: "0 12px", borderRadius: "var(--r-sm)",
              fontSize: 12, fontWeight: fullDetail ? 500 : 400,
              color: fullDetail ? "var(--bronze)" : "var(--fg-4)",
              background: fullDetail ? "var(--bronze-soft)" : "var(--surface)",
              border: `1px solid ${fullDetail ? "var(--bronze)" : "var(--line)"}`,
              cursor: "pointer", transition: "all var(--dur) var(--ease)",
            }}
          >
            {fullDetail ? "Hide full detail" : "Full detail"}
          </button>
        )}
      </div>

      {mode === "ledger" && (
        <EntryLedgerTable
          year={year}
          month={month}
          entries={entries}
          onOpenDay={(day) => { setSelectedDay(day); setMode("day"); }}
        />
      )}

      {mode === "day" && (
      <>
      {/* Day strip */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: "var(--s-5)", padding: "4px 0" }}>
        {allDays.map((day) => {
          const active = day === selectedDay;
          const hasEntry = entryMap.has(isoDate(year, month, day));
          const dayEntry = entryMap.get(isoDate(year, month, day));
          const daySales = dayEntry ? salesNetTotal(dayEntry) : 0;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              style={{
                flexShrink: 0,
                padding: "10px 12px",
                background: active ? "var(--bronze)" : "var(--surface)",
                color: active ? "#fff8ee" : hasEntry ? "var(--fg)" : "var(--fg-4)",
                border: `1px solid ${active ? "var(--bronze)" : "var(--line)"}`,
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 2,
                minWidth: 72,
                fontFamily: "inherit",
                transition: "all var(--dur) var(--ease)",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, textAlign: "left" }}>{weekdayShort(year, month, day)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: "left" }}>{String(day).padStart(2, "0")}</span>
              <span className="mono tabular-nums" style={{ fontSize: 10, opacity: 0.85, textAlign: "left" }}>
                {hasEntry ? "฿" + Math.round(daySales / 1000) + "k" : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day-focused KPI cards */}
      <div style={{ marginBottom: "var(--s-4)" }}>
        <DaySummaryCards
          entry={entry}
          cashSafe={selectedComputed?.cashSafe}
        />
      </div>

      {/* Focus content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: Net hero + breakdown bars */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)", padding: "var(--s-5)",
          position: "relative",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="eyebrow" style={{ color: "var(--fg-4)" }}>
              Net — {weekdayShort(year, month, selectedDay)} {selectedDay}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {canManage && entry && (
                <Button size="sm" variant="ghost" onClick={() => void openHistory()} title="View edit history" style={{ gap: 6 }}>
                  <HistoryIcon size={12} />
                  History
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={openEdit} style={{ gap: 6 }}>
                <PencilIcon size={12} />
                Edit day
              </Button>
            </div>
          </div>
          <div className="mono tabular-nums" style={{
            fontSize: 44, fontWeight: 500, marginTop: 6, letterSpacing: "-0.02em",
            color: net < 0 ? "var(--bad)" : "var(--fg)",
          }}>
            {entry ? thb(net) : "—"}
          </div>
          {entry && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Pill tone={net >= 0 ? "good" : "bad"}>
                {net >= 0 ? "Positive" : "Negative"}
              </Pill>
              <Pill tone="neutral">Entry recorded</Pill>
            </div>
          )}

          <div style={{ marginTop: "var(--s-5)", display: "flex", flexDirection: "column", gap: 12 }}>
            <BreakdownBar label="Sales" value={sales} max={sales || 1} tone="var(--good)" />
            <BreakdownBar label="Payments collected" value={payments} max={sales || 1} tone="var(--info)" />
            <BreakdownBar label="Expenses" value={expenses} max={sales || 1} tone="var(--bad)" />
            <BreakdownBar label="HR cost" value={hr} max={sales || 1} tone="var(--warn)" />
          </div>
        </div>

        {/* Right: Breakdown detail */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px var(--s-5)", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Breakdown</div>
            <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>
              {isoDate(year, month, selectedDay)}
            </div>
          </div>

          {/* Section 1: Revenue & payments */}
          <div style={{ padding: "var(--s-3) var(--s-5)", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-4)", marginBottom: 4 }}>
              Revenue
            </div>
            {[
              { label: "Gross sales", value: sales, tone: "var(--good)", bold: false },
            ].map(({ label, value, tone, bold }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line-2)" }}>
                <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{label}</span>
                <span className="mono tabular-nums" style={{ fontSize: 13, fontWeight: bold ? 600 : 400, color: entry ? tone : "var(--fg-4)" }}>
                  {entry ? thb(value) : "—"}
                </span>
              </div>
            ))}
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-4)", marginTop: 10, marginBottom: 4 }}>
              Payments in
            </div>
            {[
              { label: "Cash", value: entry?.payment_cash ?? 0 },
              { label: "QR / scan", value: entry?.payment_scan ?? 0 },
              { label: "Credit card", value: entry?.payment_credit_card ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0 6px 12px", borderBottom: "1px solid var(--line-2)" }}>
                <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{label}</span>
                <span className="mono tabular-nums" style={{ fontSize: 12, color: entry ? "var(--info)" : "var(--fg-4)" }}>
                  {entry ? thb(value) : "—"}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
              <span style={{ fontSize: 13, color: "var(--fg-3)" }}>Payments total</span>
              <span className="mono tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: entry ? "var(--info)" : "var(--fg-4)" }}>
                {entry ? thb(payments) : "—"}
              </span>
            </div>
          </div>

          {/* Section 2: Costs & net */}
          <div style={{ padding: "var(--s-3) var(--s-5)" }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--fg-4)", marginBottom: 4 }}>
              Costs
            </div>
            {[
              { label: "OpEx", value: expenses, tone: "var(--bad)" },
              { label: "HR payroll", value: hr, tone: "var(--warn)" },
            ].map(({ label, value, tone }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line-2)" }}>
                <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{label}</span>
                <span className="mono tabular-nums" style={{ fontSize: 13, color: entry ? tone : "var(--fg-4)" }}>
                  {entry ? thb(value) : "—"}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Net result</span>
              <span className="mono tabular-nums" style={{ fontSize: 13, fontWeight: 600, color: entry ? (net < 0 ? "var(--bad)" : "var(--bronze)") : "var(--fg-4)" }}>
                {entry ? thb(net) : "—"}
              </span>
            </div>

            {entry?.notes && (
              <div style={{ marginTop: "var(--s-3)", padding: "var(--s-2) var(--s-3)", borderRadius: "var(--r-sm)", background: "var(--bg-2)", fontSize: 12, color: "var(--fg-3)", fontStyle: "italic" }}>
                {entry.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {!entry && (
        <div style={{
          marginTop: "var(--s-4)",
          padding: "var(--s-4)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          fontSize: 13,
          color: "var(--fg-4)",
          textAlign: "center",
        }}>
          No entry recorded for this day.{" "}
          <button
            onClick={openEdit}
            style={{ color: "var(--bronze)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textDecoration: "underline" }}
          >
            Add one
          </button>
        </div>
      )}

      {/* Full detail (per-day ledger) */}
      {fullDetail && (
        <div style={{ marginTop: "var(--s-4)" }}>
          <DayFullLedger
            date={isoDate(year, month, selectedDay)}
            entry={entry}
          />
        </div>
      )}
      </>
      )}

      {/* Audit history drawer */}
      {historyOpen && (
        <>
          <div
            onClick={() => setHistoryOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 380,
            background: "var(--surface)", borderLeft: "1px solid var(--line)",
            zIndex: 41, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Edit history</span>
              <button onClick={() => setHistoryOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-4)", padding: 4 }}>
                <XIcon size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
              {historyLoading ? (
                <p style={{ fontSize: 13, color: "var(--fg-4)", paddingTop: 20 }}>Loading…</p>
              ) : historyLogs.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--fg-4)", paddingTop: 20 }}>No history recorded for this entry.</p>
              ) : historyLogs.map((log, i) => (
                <div key={log.id} style={{ paddingTop: 16, paddingBottom: 16, borderBottom: i < historyLogs.length - 1 ? "1px solid var(--line)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{log.action}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
                      {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{log.user_email ?? "Unknown user"}</span>
                  {log.payload && Object.keys(log.payload).length > 0 && (
                    <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", fontSize: 11, fontFamily: "monospace", color: "var(--fg-3)", maxHeight: 120, overflowY: "auto", wordBreak: "break-all" }}>
                      {JSON.stringify(log.payload, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Edit modal */}
      {editOpen && (
        <DailyEntryModal
          date={isoDate(year, month, selectedDay)}
          locationName={locationName}
          form={modalForm}
          saving={modalSaving}
          existingId={entry?.id}
          computedCashEndDay={selectedComputed?.cashEndDay}
          computedCashSafe={selectedComputed?.cashSafe}
          entryNotes={{ ...entryNotes, ...pendingNotes }}
          onChange={(field, val) => setModalForm((prev) => ({ ...prev, [field]: val }))}
          onNoteChange={(field, note) => setPendingNotes((prev) => ({ ...prev, [field]: note }))}
          onSave={(e) => void handleModalSave(e)}
          onDelete={entry ? () => void handleModalDelete() : undefined}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
