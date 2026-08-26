"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FileDownIcon, UploadIcon, Trash2Icon, EyeIcon, TableIcon, AlertTriangleIcon, XIcon, CloudDownloadIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AccountingFocusDay } from "@/modules/accounting/components/AccountingFocusDay";
import { MonthlyFixedExpensesTable } from "@/modules/accounting/components/MonthlyFixedExpensesTable";
import type { DailyEntry } from "@/modules/accounting/types";
import type { AdminLocation } from "@/modules/admin/types";
import { SheetImportModal } from "@/modules/accounting/components/SheetImportModal";
import { toast } from "sonner";

type MainView = "focus" | "fixed";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const VIEWS: Array<{ id: MainView; label: string; icon: LucideIcon }> = [
  { id: "focus", label: "Daily Entry",    icon: EyeIcon  },
  { id: "fixed", label: "Fixed Costs",    icon: TableIcon },
];

interface Props {
  locations: AdminLocation[];
  canManage?: boolean;
  initialLocationId?: string;
}

type ImportConfirm = {
  file: File;
  rowCount: number;
  minDate: string;
  maxDate: string;
};

// Parses a CSV line handling quoted fields
function parseCsvFirstColumn(line: string): string {
  if (!line.startsWith('"')) return line.split(",")[0] ?? "";
  let i = 1;
  let val = "";
  while (i < line.length) {
    if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
    else if (line[i] === '"') break;
    else { val += line[i]; i++; }
  }
  return val;
}

export function AccountingClient({ locations, canManage, initialLocationId }: Props) {
  const today = new Date();
  const [year, setYear]             = useState(today.getFullYear());
  const [month, setMonth]           = useState(today.getMonth() + 1);
  const [locationId, setLocationId] = useState(
    (initialLocationId && locations.some((l) => l.id === initialLocationId))
      ? initialLocationId
      : (locations[0]?.id ?? "")
  );
  const [view, setView]             = useState<MainView>("focus");
  const [entries, setEntries]       = useState<DailyEntry[]>([]);
  const [prevMonthSafe, setPrevMonthSafe] = useState<number | null>(null);
  const [importing, setImporting]       = useState(false);
  const [importConfirm, setImportConfirm] = useState<ImportConfirm | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [sheetImportOpen, setSheetImportOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const monthStr  = `${year}-${String(month).padStart(2, "0")}`;
  const days      = daysInMonth(year, month);
  const filled    = entries.length;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });

  const fetchEntries = useCallback(async () => {
    if (!locationId) return;
    const res = await fetch(`/api/accounting/entries?location_id=${locationId}&month=${monthStr}`);
    if (!res.ok) return;
    const json = await res.json() as { entries: DailyEntry[]; prev_month_safe?: number | null };
    setEntries(json.entries);
    setPrevMonthSafe(json.prev_month_safe ?? null);
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

  async function handleImportFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith("#"));

    if (lines.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }

    // Count data rows and find date range from the first column
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const dates: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const d = parseCsvFirstColumn(lines[i]);
      if (DATE_RE.test(d)) dates.push(d);
    }

    const rowCount = dates.length;
    if (rowCount === 0) {
      toast.error("No valid date rows found — make sure the first column is in YYYY-MM-DD format");
      return;
    }

    const sorted   = [...dates].sort();
    const minDate  = sorted[0]!;
    const maxDate  = sorted[sorted.length - 1]!;
    setImportConfirm({ file, rowCount, minDate, maxDate });
  }

  async function confirmImport() {
    if (!importConfirm) return;
    setImporting(true);
    setImportConfirm(null);
    try {
      const fd = new FormData();
      fd.append("file", importConfirm.file);
      fd.append("location_id", locationId);
      const res    = await fetch("/api/accounting/import", { method: "POST", body: fd });
      const result = await res.json() as { inserted?: number; errors?: string[]; error?: string };
      if (!res.ok) {
        toast.error(result.error ?? "Import failed");
        return;
      }
      const { inserted = 0, errors: rowErrors = [] } = result;
      if (rowErrors.length > 0) {
        toast.warning(`Imported ${inserted} rows. ${rowErrors.length} row(s) had errors — check console.`);
        console.warn("Import row errors:", rowErrors);
      } else {
        toast.success(`Imported ${inserted} rows successfully`);
      }
      if (inserted > 0) void fetchEntries();
    } finally {
      setImporting(false);
    }
  }

  async function confirmDeleteMonth() {
    setDeleting(true);
    setDeleteConfirm(false);
    try {
      const res = await fetch(
        `/api/accounting/entries?location_id=${locationId}&month=${monthStr}`,
        { method: "DELETE" },
      );
      const result = await res.json() as { deleted?: number; error?: string };
      if (!res.ok) { toast.error(result.error ?? "Delete failed"); return; }
      toast.success(`Deleted ${result.deleted ?? 0} entries for ${monthName}`);
      setEntries([]);
    } finally {
      setDeleting(false);
    }
  }

  const isBehind = filled < today.getDate() && year === today.getFullYear() && month === today.getMonth() + 1;
  const currentLocationName = locations.find((l) => l.id === locationId)?.name ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        title="Accounting"
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-2)" }}>
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
                  Export CSV
                </Button>
              </a>
            )}

            {/* Import template + import */}
            {view !== "fixed" && (
              <>
                <a
                  href={`/api/accounting/template?location_name=${encodeURIComponent(currentLocationName)}&month=${monthStr}`}
                  download={`accounting-${monthStr}.csv`}
                >
                  <Button size="sm" variant="secondary" title="Download blank import template">
                    <FileDownIcon size={13} />
                    Template
                  </Button>
                </a>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) => void handleImportFileSelect(e)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={importing}
                  onClick={() => importInputRef.current?.click()}
                >
                  <UploadIcon size={13} />
                  {importing ? "Importing…" : "Import CSV"}
                </Button>
              </>
            )}

            {/* Import from Google Sheets — owner only */}
            {view !== "fixed" && canManage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSheetImportOpen(true)}
                title="Import from Google Sheets"
              >
                <CloudDownloadIcon size={13} />
                Sheets
              </Button>
            )}

            {/* Delete month — owner only */}
            {view !== "fixed" && canManage && (
              <Button
                size="sm"
                variant="secondary"
                disabled={deleting || filled === 0}
                onClick={() => setDeleteConfirm(true)}
                style={{ color: "var(--error, #e53e3e)", borderColor: "var(--error-line, #fed7d7)" }}
                title="Delete all entries for this month"
              >
                <Trash2Icon size={13} />
                {deleting ? "Deleting…" : "Clear month"}
              </Button>
            )}
          </div>
        }
      />

      {/* Selectors row */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--s-3)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-3)" }}>
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
        </div>

      {/* Import confirmation banner */}
      {importConfirm && (
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
          gap: "var(--s-3)", padding: "var(--s-3) var(--s-4)",
          borderRadius: "var(--r-md)", border: "1px solid var(--warn)",
          background: "var(--warn-soft)", color: "var(--fg)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            <AlertTriangleIcon size={14} style={{ color: "var(--warn)", flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>
              Import <strong>{importConfirm.rowCount}</strong> rows for{" "}
              <strong>{currentLocationName}</strong> ({importConfirm.minDate} → {importConfirm.maxDate}).
              Existing entries for these dates will be overwritten.
            </span>
          </div>
          <div style={{ display: "flex", gap: "var(--s-2)", flexShrink: 0 }}>
            <Button size="sm" variant="secondary" onClick={() => setImportConfirm(null)}>
              <XIcon size={12} /> Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={() => void confirmImport()}>
              Confirm import
            </Button>
          </div>
        </div>
      )}

      {/* Delete month confirmation banner */}
      {deleteConfirm && (
        <div style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
          gap: "var(--s-3)", padding: "var(--s-3) var(--s-4)",
          borderRadius: "var(--r-md)", border: "1px solid var(--error, #e53e3e)",
          background: "var(--error-soft, #fff5f5)", color: "var(--fg)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            <Trash2Icon size={14} style={{ color: "var(--error, #e53e3e)", flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>
              Delete the <strong>{filled}</strong> entries for{" "}
              <strong>{currentLocationName}</strong> for <strong>{monthName}</strong>?
              This action cannot be undone.
            </span>
          </div>
          <div style={{ display: "flex", gap: "var(--s-2)", flexShrink: 0 }}>
            <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(false)}>
              <XIcon size={12} /> Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void confirmDeleteMonth()}
              style={{ background: "var(--error, #e53e3e)", borderColor: "var(--error, #e53e3e)" }}
            >
              Delete {filled} entries
            </Button>
          </div>
        </div>
      )}

        {/* View toggle — right side of selectors row */}
        <div style={{
          display: "inline-flex", borderRadius: "var(--r-md)",
          border: "1px solid var(--line)", background: "var(--bg-2)",
          padding: 3, gap: 2,
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
      </div>

      {/* Focus day */}
      {view === "focus" && (
        <AccountingFocusDay
          year={year}
          month={month}
          entries={entries}
          locationId={locationId}
          locations={locations}
          canManage={canManage}
          prevMonthCashSafe={prevMonthSafe ?? undefined}
          onEntryUpdate={handleEntryUpdate}
          onEntryDelete={handleEntryDelete}
        />
      )}

      {/* Monthly fixed expenses */}
      {view === "fixed" && (
        <MonthlyFixedExpensesTable
          locationId={locationId}
          locations={locations}
          year={year}
        />
      )}

      {/* Google Sheets import modal — owner only */}
      {sheetImportOpen && (() => {
        const loc = locations.find((l) => l.id === locationId);
        if (!loc) return null;
        return (
          <SheetImportModal
            location={loc}
            onClose={() => setSheetImportOpen(false)}
            onImported={() => void fetchEntries()}
          />
        );
      })()}
    </div>
  );
}
