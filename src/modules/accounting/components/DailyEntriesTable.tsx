"use client";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { CopyIcon, CheckIcon } from "lucide-react";
import { DailyEntryModal } from "@/modules/accounting/components/DailyEntryModal";
import {
  toFormState,
  fromFormState,
  salesNetTotal,
  expTotal,
  hrTotal,
  cashEndDayCalc,
  cashSafeCalc,
  hrCashPaid,
  type DailyEntry,
  type EntryFormState,
} from "@/modules/accounting/types";
import type { AdminLocation } from "@/modules/admin/types";

function thb(n: number): string {
  if (n === 0) return "—";
  const abs = Math.round(Math.abs(n));
  return (n < 0 ? "−" : "") + "฿" + abs.toLocaleString("en");
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

type SmartRow = {
  day: number;
  date: string;
  dayLabel: string;
  sales: number;
  payments: number;
  expenses: number;
  hr: number;
  net: number;
  hasEntry: boolean;
};

function buildSmartRow(year: number, month: number, day: number, entry: DailyEntry | undefined): SmartRow {
  const date = isoDate(year, month, day);
  const dayLabel = weekdayShort(year, month, day);
  if (!entry) return { day, date, dayLabel, sales: 0, payments: 0, expenses: 0, hr: 0, net: 0, hasEntry: false };
  const sales = salesNetTotal(entry);
  const payments = entry.payment_cash + entry.payment_scan + entry.payment_credit_card;
  const expenses = expTotal(entry);
  const hr = hrTotal(entry);
  const net = sales - expenses - hr;
  return { day, date, dayLabel, sales, payments, expenses, hr, net, hasEntry: true };
}

function groupByWeek(rows: SmartRow[]): Array<{ label: string; rows: SmartRow[] }> {
  const groups: Array<{ label: string; rows: SmartRow[] }> = [];
  let current: SmartRow[] = [];
  let weekNum = 1;
  for (const row of rows) {
    const wd = new Date(row.date).getDay(); // 0=Sun…6=Sat
    if (wd === 1 && current.length > 0) {
      groups.push({ label: `Week ${weekNum}`, rows: current });
      weekNum++;
      current = [];
    }
    current.push(row);
  }
  if (current.length > 0) groups.push({ label: `Week ${weekNum}`, rows: current });
  return groups;
}

const COLS = [
  { key: "sales",    label: "Sales",    tone: "var(--good)"   },
  { key: "payments", label: "Payments", tone: "var(--info)"   },
  { key: "expenses", label: "Expenses", tone: "var(--bad)"    },
  { key: "hr",       label: "HR",       tone: "var(--warn)"   },
  { key: "net",      label: "Net",      tone: "var(--bronze)" },
] as const;
type ColKey = typeof COLS[number]["key"];

const GRID = "110px 1fr 1fr 1fr 1fr 1fr 36px";

// ── Column header ─────────────────────────────────────────────────────────────

function ColumnHeader({ label, total }: { label: string; total: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-3)" }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 500 }}>
        {thb(total)}
      </span>
    </div>
  );
}

// ── Day row ───────────────────────────────────────────────────────────────────

function DayRow({ row, onOpen }: { row: SmartRow; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCSV = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const cols = COLS.map((c) => c.key);
    const csv = `date,${cols.join(",")}\n${row.date},${cols.map((c) => row[c]).join(",")}`;
    void navigator.clipboard?.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }, [row]);

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid", gridTemplateColumns: GRID,
        padding: "10px var(--s-4)",
        borderBottom: "1px solid var(--line-2)",
        cursor: "pointer",
        background: hovered ? "var(--row-hover)" : "transparent",
        transition: "background var(--dur) var(--ease)",
        gap: 12,
        alignItems: "center",
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontWeight: 500, color: "var(--fg)" }}>{row.dayLabel}</span>
        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>{row.date.slice(5)}</span>
      </div>
      {COLS.map((c) => (
        <span
          key={c.key}
          className="mono tabular-nums"
          style={{ color: c.key === "net" && row[c.key] < 0 ? "var(--bad)" : row.hasEntry ? "var(--fg)" : "var(--fg-4)" }}
        >
          {row.hasEntry ? thb(row[c.key]) : "—"}
        </span>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {hovered && (
          <button
            onClick={copyCSV}
            title="Copy row as CSV"
            style={{
              width: 26, height: 26, borderRadius: 6,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: copied ? "var(--good)" : "var(--fg-3)",
              background: copied ? "var(--good-soft)" : "transparent",
              border: "none", cursor: "pointer",
            }}
          >
            {copied
              ? <CheckIcon style={{ width: 13, height: 13 }} />
              : <CopyIcon style={{ width: 13, height: 13 }} />
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  year: number;
  month: number;
  locationId: string;
  locations: AdminLocation[];
  entries: DailyEntry[];
  loading: boolean;
  prevMonthCashSafe?: number;
  onEntryUpdate: (entry: DailyEntry) => void;
  onEntryDelete: (id: string) => void;
}

export function DailyEntriesTable({
  year, month, locationId, locations, entries, loading, prevMonthCashSafe, onEntryUpdate, onEntryDelete,
}: Props) {
  const days = daysInMonth(year, month);
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });

  // Modal state
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState<EntryFormState>(toFormState({}));
  const [modalSaving, setModalSaving] = useState(false);

  const entryMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const e of entries) m.set(e.entry_date, e);
    return m;
  }, [entries]);

  const computedValues = useMemo(() => {
    const map = new Map<string, { cashEndDay: number; cashSafe: number }>();
    let prevSafe = prevMonthCashSafe ?? 0;
    for (let day = 1; day <= days; day++) {
      const date = isoDate(year, month, day);
      const entry = entryMap.get(date);
      if (entry) {
        const cashEnd = cashEndDayCalc(entry);
        const safe = entry.cash_safe_is_override
          ? entry.cash_safe
          : cashSafeCalc(cashEnd, prevSafe, entry.cash_to_boss, hrCashPaid(entry));
        map.set(date, { cashEndDay: cashEnd, cashSafe: safe });
        prevSafe = safe;
      } else {
        map.set(date, { cashEndDay: 0, cashSafe: prevSafe });
      }
    }
    return map;
  }, [days, year, month, entryMap, prevMonthCashSafe]);

  // Build smart rows
  const allRows = useMemo<SmartRow[]>(
    () => Array.from({ length: days }, (_, i) => buildSmartRow(year, month, i + 1, entryMap.get(isoDate(year, month, i + 1)))),
    [days, year, month, entryMap],
  );

  const weekGroups = useMemo(() => groupByWeek(allRows), [allRows]);

  // Month totals
  const monthTotals = useMemo<Record<ColKey, number>>(
    () => Object.fromEntries(COLS.map((c) => [c.key, allRows.reduce((s, r) => s + r[c.key], 0)])) as Record<ColKey, number>,
    [allRows],
  );

  // ── Modal open/nav ───────────────────────────────────────────────────────────

  function openModal(day: number) {
    const date = isoDate(year, month, day);
    setModalForm(toFormState(entryMap.get(date) ?? {}));
    setOpenDay(day);
  }

  function navDay(delta: -1 | 1) {
    if (openDay === null) return;
    const next = openDay + delta;
    if (next < 1 || next > days) return;
    openModal(next);
  }

  async function handleModalSave(e: React.FormEvent) {
    e.preventDefault();
    if (openDay === null) return;
    setModalSaving(true);
    try {
      const date = isoDate(year, month, openDay);
      const fieldVals = fromFormState(modalForm);
      const fakeEntry = { ...fieldVals } as unknown as DailyEntry;
      const cashEnd = cashEndDayCalc(fakeEntry);
      const prevDateKey = openDay > 1 ? isoDate(year, month, openDay - 1) : null;
      const prevSafe = prevDateKey ? (computedValues.get(prevDateKey)?.cashSafe ?? 0) : (prevMonthCashSafe ?? 0);
      const safeCash = cashSafeCalc(cashEnd, prevSafe, fakeEntry.cash_to_boss, hrCashPaid(fakeEntry));

      const res = await fetch("/api/accounting/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, entry_date: date, ...fieldVals, cash_end_day: cashEnd, cash_safe: safeCash, cash_safe_is_override: false }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Save failed");
        return;
      }
      onEntryUpdate(await res.json() as DailyEntry);
      setOpenDay(null);
      toast.success("Entry saved");
    } finally {
      setModalSaving(false);
    }
  }

  async function handleModalDelete() {
    if (openDay === null) return;
    const entry = entryMap.get(isoDate(year, month, openDay));
    if (!entry) return;
    const res = await fetch(`/api/accounting/entries/${entry.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    onEntryDelete(entry.id);
    setOpenDay(null);
    toast.success("Entry deleted");
  }

  const locationName = locations.find((l) => l.id === locationId)?.name ?? "";

  if (loading) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden", background: "var(--surface)" }}>
        {/* Column header row with sparklines */}
        <div style={{
          display: "grid", gridTemplateColumns: GRID,
          padding: "12px var(--s-4)",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--line)",
          alignItems: "flex-end",
          gap: 12,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div className="eyebrow" style={{ color: "var(--fg-4)" }}>Day</div>
          {COLS.map((c) => (
            <ColumnHeader
              key={c.key}
              label={c.label}
              total={monthTotals[c.key]}
            />
          ))}
          <div />
        </div>

        {/* Weeks */}
        {weekGroups.map((group) => {
          const weekTotals = Object.fromEntries(
            COLS.map((c) => [c.key, group.rows.reduce((s, r) => s + r[c.key], 0)])
          ) as Record<ColKey, number>;

          return (
            <div key={group.label}>
              {group.rows.map((row) => (
                <DayRow key={row.day} row={row} onOpen={() => openModal(row.day)} />
              ))}

              {/* Weekly subtotal */}
              <div style={{
                display: "grid", gridTemplateColumns: GRID,
                padding: "10px var(--s-4)",
                background: "var(--bg-2)",
                borderTop: "1px solid var(--line)",
                borderBottom: "1px solid var(--line)",
                alignItems: "center",
                gap: 12,
                fontSize: 12,
              }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 500, color: "var(--fg)" }}>{group.label}</span>
                  <span style={{ color: "var(--fg-4)" }}>subtotal</span>
                </div>
                {COLS.map((c) => (
                  <span key={c.key} className="mono tabular-nums" style={{ fontWeight: 500, color: "var(--fg)" }}>
                    {thb(weekTotals[c.key])}
                  </span>
                ))}
                <div />
              </div>
            </div>
          );
        })}

        {/* Month total */}
        <div style={{
          display: "grid", gridTemplateColumns: GRID,
          padding: "14px var(--s-4)",
          background: "var(--bronze-soft)",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, color: "var(--fg)" }}>{monthName}</div>
          {COLS.map((c) => (
            <span key={c.key} className="mono tabular-nums" style={{ fontWeight: 600, color: "var(--fg)" }}>
              {thb(monthTotals[c.key])}
            </span>
          ))}
          <div />
        </div>

        {entries.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-4)" }}>
            No entries yet. Click any day row to start.
          </div>
        )}
      </div>

      {/* Day entry drawer */}
      {openDay !== null && (
        <DailyEntryModal
          date={isoDate(year, month, openDay)}
          locationName={locationName}
          form={modalForm}
          saving={modalSaving}
          existingId={entryMap.get(isoDate(year, month, openDay))?.id}
          computedCashEndDay={computedValues.get(isoDate(year, month, openDay))?.cashEndDay}
          computedCashSafe={computedValues.get(isoDate(year, month, openDay))?.cashSafe}
          onChange={(field, val) => setModalForm((f) => ({ ...f, [field]: val }))}
          onSave={(e) => void handleModalSave(e)}
          onDelete={() => void handleModalDelete()}
          onClose={() => setOpenDay(null)}
          onPrev={openDay > 1 ? () => navDay(-1) : undefined}
          onNext={openDay < days ? () => navDay(1) : undefined}
        />
      )}
    </>
  );
}
