"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountingSummaryCards } from "@/modules/accounting/components/AccountingSummaryCards";
import { DailyEntriesTable } from "@/modules/accounting/components/DailyEntriesTable";
import { MonthlyFixedExpensesTable } from "@/modules/accounting/components/MonthlyFixedExpensesTable";
import type { DailyEntry } from "@/modules/accounting/types";
import type { AdminLocation } from "@/modules/admin/types";

type MainTab = "daily" | "fixed";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

interface Props {
  locations: AdminLocation[];
}

export function AccountingClient({ locations }: Props) {
  const today = new Date();
  const [year, setYear]           = useState(today.getFullYear());
  const [month, setMonth]         = useState(today.getMonth() + 1);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<MainTab>("daily");
  const [entries, setEntries]     = useState<DailyEntry[]>([]);
  const [loading, setLoading]     = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const days = daysInMonth(year, month);
  const filled = entries.length;
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

  const exportHref = activeTab === "daily"
    ? `/api/accounting/export?month=${monthStr}&location_id=${locationId}`
    : `/api/accounting/export?type=fixed&year=${year}&location_id=${locationId}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Accounting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track daily sales, payments, expenses, HR, and cash movements by shop.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Location selector */}
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          {/* Month navigation (visible for both tabs, month used for daily) */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="text-sm font-medium w-36 text-center tabular-nums">{monthName}</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          {/* Days filled badge (daily tab only) */}
          {activeTab === "daily" && (
            <span className={`text-xs px-2 py-1 rounded-md border ${
              filled < today.getDate() && year === today.getFullYear() && month === today.getMonth() + 1
                ? "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                : "border-border bg-muted/20 text-muted-foreground"
            }`}>
              {filled} / {days} days
            </span>
          )}

          {/* CSV export */}
          <a href={exportHref} download>
            <Button size="sm" variant="outline" className="gap-1.5 h-8">
              <DownloadIcon className="size-3.5" />
              CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Main tab switcher */}
      <div className="flex rounded-md border border-border overflow-hidden w-fit text-xs">
        {(["daily", "fixed"] as MainTab[]).map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 ${i > 0 ? "border-l border-border" : ""} ${
              activeTab === tab
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {tab === "daily" ? "Daily Entries" : "Monthly Fixed Expenses"}
          </button>
        ))}
      </div>

      {/* Daily entries view */}
      {activeTab === "daily" && (
        <>
          {filled > 0 && (
            <AccountingSummaryCards
              entries={entries}
              daysInMonth={days}
              today={today}
              month={month}
              year={year}
            />
          )}
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
        </>
      )}

      {/* Monthly fixed expenses view */}
      {activeTab === "fixed" && (
        <MonthlyFixedExpensesTable
          locationId={locationId}
          locations={locations}
        />
      )}
    </div>
  );
}
