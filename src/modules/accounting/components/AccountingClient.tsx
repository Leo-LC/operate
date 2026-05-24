"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, ListIcon, EyeIcon, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AccountingSummaryCards } from "@/modules/accounting/components/AccountingSummaryCards";
import { DailyEntriesTable } from "@/modules/accounting/components/DailyEntriesTable";
import { AccountingFocusDay } from "@/modules/accounting/components/AccountingFocusDay";
import { MonthlyFixedExpensesTable } from "@/modules/accounting/components/MonthlyFixedExpensesTable";
import type { DailyEntry } from "@/modules/accounting/types";
import type { AdminLocation } from "@/modules/admin/types";

type MainView = "smart" | "focus" | "fixed";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const VIEWS: Array<{ id: MainView; label: string; icon: typeof ListIcon }> = [
  { id: "smart", label: "Smart table", icon: ListIcon },
  { id: "focus", label: "Focus day",   icon: EyeIcon  },
  { id: "fixed", label: "Fixed costs", icon: TableIcon },
];

interface Props {
  locations: AdminLocation[];
  canManage?: boolean;
}

export function AccountingClient({ locations, canManage }: Props) {
  const today = new Date();
  const [year, setYear]             = useState(today.getFullYear());
  const [month, setMonth]           = useState(today.getMonth() + 1);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [view, setView]             = useState<MainView>("smart");
  const [entries, setEntries]       = useState<DailyEntry[]>([]);
  const [loading, setLoading]       = useState(false);

  const monthStr  = `${year}-${String(month).padStart(2, "0")}`;
  const days      = daysInMonth(year, month);
  const filled    = entries.length;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });

  const fetchEntries = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/entries?location_id=${locationId}&month=${monthStr}`);
      if (!res.ok) return;
      const json = await res.json() as { entries: DailyEntry[] };
      setEntries(json.entries);
    } finally {
      setLoading(false);
    }
  }, [locationId, monthStr]);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function handleEntryUpdate(entry: DailyEntry) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.entry_date === entry.entry_date);
      if (idx >= 0) { const next = [...prev]; next[idx] = entry; return next; }
      return [...prev, entry].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    });
  }

  function handleEntryDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const isBehind = filled < today.getDate() && year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        eyebrow={monthName}
        title="Accounting"
        subtitle="Daily roll-up by shop. Click any row to view or edit."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            {/* Location selector */}
            {locations.length > 1 && (
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                style={{
                  height: 34, borderRadius: "var(--r-sm)",
                  border: "1px solid var(--line)", background: "var(--surface)",
                  color: "var(--fg)", padding: "0 var(--s-3)", fontSize: 13,
                  fontFamily: "var(--font-sans)", outline: "none",
                }}
              >
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            )}

            {/* Month navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                onClick={prevMonth}
                style={{
                  width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--surface)",
                  color: "var(--fg-3)", cursor: "pointer",
                }}
              >
                <ChevronLeftIcon size={14} />
              </button>
              <span
                className="mono tabular-nums"
                style={{ fontSize: 13, fontWeight: 500, width: 140, textAlign: "center", color: "var(--fg)" }}
              >
                {monthName}
              </span>
              <button
                onClick={nextMonth}
                style={{
                  width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--surface)",
                  color: "var(--fg-3)", cursor: "pointer",
                }}
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>

            {/* Days filled badge */}
            {view !== "fixed" && (
              <span style={{
                fontSize: 11, fontWeight: 500, padding: "3px 8px",
                borderRadius: "var(--r-pill)",
                border: `1px solid ${isBehind ? "var(--warn)" : "var(--line)"}`,
                background: isBehind ? "var(--warn-soft)" : "var(--bg-2)",
                color: isBehind ? "var(--warn)" : "var(--fg-4)",
                fontFamily: "var(--font-mono)",
              }}>
                {filled} / {days} days
              </span>
            )}

            {/* CSV export */}
            {view !== "fixed" && (
              <a href={`/api/accounting/export?month=${monthStr}&location_id=${locationId}`} download>
                <Button size="sm" variant="secondary">
                  <DownloadIcon size={13} />
                  CSV
                </Button>
              </a>
            )}
          </div>
        }
      />

      {/* View toggle */}
      <div style={{
        display: "inline-flex", borderRadius: "var(--r-md)",
        border: "1px solid var(--line)", background: "var(--bg-2)",
        padding: 3, gap: 2, alignSelf: "flex-start",
      }}>
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 28, padding: "0 12px", borderRadius: "var(--r-sm)",
              fontSize: 12, fontWeight: view === id ? 500 : 400,
              color: view === id ? "var(--fg)" : "var(--fg-4)",
              background: view === id ? "var(--surface)" : "transparent",
              border: `1px solid ${view === id ? "var(--line)" : "transparent"}`,
              boxShadow: view === id ? "var(--shadow-1)" : "none",
              cursor: "pointer", transition: "all var(--dur) var(--ease)",
            }}
          >
            <Icon size={12} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Summary stats band */}
      {(view === "smart" || view === "focus") && filled > 0 && (
        <AccountingSummaryCards
          entries={entries}
          daysInMonth={days}
          today={today}
          month={month}
          year={year}
        />
      )}

      {/* Smart table */}
      {view === "smart" && (
        <DailyEntriesTable
          year={year}
          month={month}
          locationId={locationId}
          locations={locations}
          entries={entries}
          loading={loading}
          onEntryUpdate={handleEntryUpdate}
          onEntryDelete={handleEntryDelete}
        />
      )}

      {/* Focus day */}
      {view === "focus" && (
        <AccountingFocusDay
          year={year}
          month={month}
          entries={entries}
        />
      )}

      {/* Monthly fixed expenses */}
      {view === "fixed" && (
        <MonthlyFixedExpensesTable
          locationId={locationId}
          locations={locations}
          canManageCategories={canManage}
        />
      )}
    </div>
  );
}
