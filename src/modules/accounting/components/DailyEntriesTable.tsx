"use client";
import { useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyEntryModal } from "@/modules/accounting/components/DailyEntryModal";
import {
  EMPTY_ENTRY,
  toFormState,
  fromFormState,
  salesNetTotal,
  paymentDelta,
  cashEndDayCalc,
  cashSafeCalc,
  type DailyEntry,
  type EntryFormState,
} from "@/modules/accounting/types";
import {
  DAILY_ENTRY_SECTIONS,
  resolveField,
  type FieldKey,
} from "@/modules/accounting/config";
import type { AdminLocation } from "@/modules/admin/types";

type SectionTab = "full" | "sales" | "payments" | "expenses" | "hr" | "treasury";
type RowState = "future" | "empty" | "partial" | "complete" | "mismatch";

const ROW_STATE_DOT: Record<RowState, string> = {
  future:   "text-muted-foreground/20",
  empty:    "text-muted-foreground/35",
  partial:  "text-amber-500",
  complete: "text-green-500",
  mismatch: "text-destructive",
};

function getRowState(date: string, entry: DailyEntry | undefined, today: string): RowState {
  if (date > today) return "future";
  if (!entry) return "empty";
  if (salesNetTotal(entry) === 0) return "partial";
  if (Math.abs(paymentDelta(entry)) > 10) return "mismatch";
  return "complete";
}

function fmt(n: number) {
  return n === 0 ? "" : n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtSigned(n: number) {
  if (n === 0) return "";
  const s = n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n > 0 ? `+${s}` : s;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekdayShort(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).toLocaleDateString("en", { weekday: "short" });
}

// Section tab metadata — colors mirror main table section headers
const SECTION_TABS: Array<{ id: SectionTab; label: string; activeClass: string; headerClass: string }> = [
  { id: "full",     label: "Full",     activeClass: "bg-accent text-accent-foreground",                                               headerClass: "" },
  { id: "sales",    label: "Sales",    activeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",   headerClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-b border-emerald-500/20" },
  { id: "payments", label: "Payments", activeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",              headerClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-b border-blue-500/20" },
  { id: "expenses", label: "Expenses", activeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",          headerClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-b border-amber-500/20" },
  { id: "hr",       label: "HR",       activeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",              headerClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-b border-rose-500/20" },
  { id: "treasury", label: "Treasury", activeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",          headerClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-b border-slate-500/20" },
];

// Shared classes
const CELL_BORDER = "border-r border-border/20";
// Calculated column background — blue-gray tint to clearly signal read-only / non-editable
const CALC_BG = "bg-slate-500/[0.07] dark:bg-slate-400/[0.07]";

function getSectionFields(tab: SectionTab) {
  if (tab === "full") return DAILY_ENTRY_SECTIONS.flatMap((s) => s.fields);
  return DAILY_ENTRY_SECTIONS.find((s) => s.id === tab)?.fields ?? [];
}

// ── Cell component ─────────────────────────────────────────────────────────────
// Each Cell IS its own <td>. Never wrap in another <td>.

interface CellProps {
  entry: DailyEntry | undefined;
  fieldKey: FieldKey;
  calculated: boolean;
  isEditing: boolean;
  editValue: string;
  day: number;
  overrideValue?: number;
  extraClass?: string;
  isOverrideable?: boolean;
  onStartEdit: (day: number, field: FieldKey, current: number) => void;
  onEditChange: (val: string) => void;
  onEditCommit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRequestOverride?: (day: number, current: number) => void;
}

function Cell({
  entry,
  fieldKey,
  calculated,
  isEditing,
  editValue,
  day,
  overrideValue,
  extraClass = "",
  isOverrideable = false,
  onStartEdit,
  onEditChange,
  onEditCommit,
  onEditKeyDown,
  onRequestOverride,
}: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rawValue = entry ? resolveField(entry, fieldKey) : 0;
  const value = overrideValue !== undefined ? overrideValue : rawValue;

  const isDelta = fieldKey === "__payment_delta__";
  const deltaClass = isDelta
    ? Math.abs(value) > 10
      ? "text-destructive font-medium"
      : value !== 0 ? "text-green-600 dark:text-green-400" : ""
    : "";

  const isManualOverride = fieldKey === "cash_safe" && entry?.cash_safe_is_override;

  if (isEditing) {
    return (
      <td className={`px-3 h-8 text-right text-xs tabular-nums ${CELL_BORDER} ${extraClass} relative`}>
        {/* Invisible text anchors the column to its natural display width */}
        <span aria-hidden="true" className="invisible">{fmt(value)}</span>
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          autoFocus
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onEditCommit}
          onKeyDown={onEditKeyDown}
          className="absolute inset-0 px-2 h-full w-full border border-ring bg-background text-xs text-right focus:outline-none"
        />
      </td>
    );
  }

  // Calculated, non-overrideable: read-only, dimmed
  if (calculated && !isOverrideable) {
    return (
      <td className={`px-3 h-8 text-right text-xs tabular-nums text-muted-foreground/70 italic ${CELL_BORDER} ${CALC_BG} ${deltaClass} ${extraClass}`}>
        {isDelta ? fmtSigned(value) : fmt(value)}
      </td>
    );
  }

  // Calculated but overrideable (cash_safe)
  if (calculated && isOverrideable) {
    return (
      <td
        className={`px-3 h-8 text-right text-xs tabular-nums ${CELL_BORDER} ${CALC_BG} cursor-pointer hover:bg-amber-50/60 dark:hover:bg-amber-900/15 hover:outline hover:outline-1 hover:outline-amber-400/60 hover:[outline-offset:-1px] transition-colors select-none ${extraClass} ${isManualOverride ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground/70 italic"}`}
        onClick={() => onRequestOverride?.(day, value)}
        title={isManualOverride ? "Manually overridden — click to change" : "Click to manually override"}
      >
        {fmt(value)}{isManualOverride && <span className="text-[8px] ml-0.5 align-super">✎</span>}
      </td>
    );
  }

  // Editable
  return (
    <td
      className={`px-3 h-8 text-right text-xs tabular-nums cursor-pointer select-none ${CELL_BORDER} hover:bg-accent/20 hover:outline hover:outline-1 hover:outline-border/60 hover:[outline-offset:-1px] transition-colors ${!entry ? "text-muted-foreground/30" : ""} ${deltaClass} ${extraClass}`}
      onClick={() => onStartEdit(day, fieldKey, entry ? rawValue : 0)}
      title={!entry ? "Click to add" : undefined}
    >
      {isDelta ? fmtSigned(value) : fmt(value)}
    </td>
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
  onEntryUpdate: (entry: DailyEntry) => void;
  onEntryDelete: (id: string) => void;
}

export function DailyEntriesTable({
  year,
  month,
  locationId,
  locations,
  entries,
  loading,
  onEntryUpdate,
  onEntryDelete,
}: Props) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const days = daysInMonth(year, month);

  const [activeTab, setActiveTab] = useState<SectionTab>("full");
  const [editingCell, setEditingCell] = useState<{ day: number; field: FieldKey } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState<EntryFormState>(toFormState({}));
  const [modalSaving, setModalSaving] = useState(false);

  // Cash-safe override modal
  const [overrideModal, setOverrideModal] = useState<{ day: number; currentValue: number } | null>(null);
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);

  const entryMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const e of entries) m.set(e.entry_date, e);
    return m;
  }, [entries]);

  // Running chain for cash_end_day and cash_safe.
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

  const fields = getSectionFields(activeTab);
  const editableFields = useMemo(() => fields.filter((f) => !f.calculated), [fields]);

  // Section border column indexes for Full view
  const sectionBorderIndexes = useMemo(() => {
    if (activeTab !== "full") return new Set<number>();
    const indexes = new Set<number>();
    let count = 0;
    for (const section of DAILY_ENTRY_SECTIONS) {
      if (count > 0) indexes.add(count);
      count += section.fields.length;
    }
    return indexes;
  }, [activeTab]);

  const currentSectionMeta = SECTION_TABS.find((t) => t.id === activeTab)!;

  // ── Inline editing ─────────────────────────────────────────────────────────

  const startEdit = useCallback((day: number, field: FieldKey, current: number) => {
    setEditingCell({ day, field });
    setEditValue(current === 0 ? "" : String(current));
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingCell) return;
    const { day, field } = editingCell;
    setEditingCell(null);

    const date = isoDate(year, month, day);
    const existing = entryMap.get(date);
    const numVal = parseFloat(editValue) || 0;

    const base = existing ? fromFormState(toFormState(existing)) : fromFormState(toFormState({}));
    const updated = { ...base, [field as string]: numVal, cash_safe_is_override: false };

    const fakeEntry = { ...updated } as unknown as DailyEntry;
    const cashEnd = cashEndDayCalc(fakeEntry);
    const prevDateKey = day > 1 ? isoDate(year, month, day - 1) : null;
    const prevSafe = prevDateKey ? (computedValues.get(prevDateKey)?.cashSafe ?? 0) : 0;
    const safeCash = cashSafeCalc(cashEnd, prevSafe, fakeEntry.cash_to_boss);

    setSavingDay(day);
    try {
      const res = await fetch("/api/accounting/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, entry_date: date, ...updated, cash_end_day: cashEnd, cash_safe: safeCash }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Save failed");
        return;
      }
      onEntryUpdate(await res.json() as DailyEntry);
    } finally {
      setSavingDay(null);
    }
  }, [editingCell, editValue, year, month, locationId, entryMap, onEntryUpdate, computedValues]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); void commitEdit(); }
    if (e.key === "Escape") { setEditingCell(null); }
    if (e.key === "Tab") {
      e.preventDefault();
      if (!editingCell) return;
      const { day, field } = editingCell;
      const idx = editableFields.findIndex((f) => f.key === field);
      const dir = e.shiftKey ? -1 : 1;
      const nextIdx = idx + dir;
      if (nextIdx >= 0 && nextIdx < editableFields.length) {
        const nextField = editableFields[nextIdx];
        const entry = entryMap.get(isoDate(year, month, day));
        const current = entry ? resolveField(entry, nextField.key) : 0;
        // Commit current cell (sets editingCell null), then immediately open next.
        // React batches both setState calls so the next cell opens without flicker.
        void commitEdit();
        startEdit(day, nextField.key, current);
      } else {
        void commitEdit();
      }
    }
  }, [commitEdit, editingCell, editableFields, entryMap, year, month, startEdit]);

  // ── Cash safe override ─────────────────────────────────────────────────────

  function openOverride(day: number, currentValue: number) {
    setOverrideModal({ day, currentValue });
    setOverrideValue(currentValue === 0 ? "" : String(currentValue));
  }

  async function confirmOverride() {
    if (!overrideModal) return;
    const { day } = overrideModal;
    const date = isoDate(year, month, day);
    const existing = entryMap.get(date);
    const newSafe = parseFloat(overrideValue) || 0;

    const base = existing ? fromFormState(toFormState(existing)) : fromFormState(toFormState({}));
    const cashEnd = cashEndDayCalc({ ...base } as unknown as DailyEntry);

    setOverrideSaving(true);
    try {
      const res = await fetch("/api/accounting/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, entry_date: date, ...base, cash_end_day: cashEnd, cash_safe: newSafe, cash_safe_is_override: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Override failed");
        return;
      }
      onEntryUpdate(await res.json() as DailyEntry);
      setOverrideModal(null);
      toast.success("Cash safe overridden");
    } finally {
      setOverrideSaving(false);
    }
  }

  // ── Modal editing ──────────────────────────────────────────────────────────

  function openModal(day: number) {
    const date = isoDate(year, month, day);
    setModalForm(toFormState(entryMap.get(date) ?? {}));
    setModalDay(day);
  }

  async function handleModalSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modalDay) return;
    setModalSaving(true);
    try {
      const date = isoDate(year, month, modalDay);
      const fieldVals = fromFormState(modalForm);
      const fakeEntry = { ...fieldVals } as unknown as DailyEntry;
      const cashEnd = cashEndDayCalc(fakeEntry);
      const prevDateKey = modalDay > 1 ? isoDate(year, month, modalDay - 1) : null;
      const prevSafe = prevDateKey ? (computedValues.get(prevDateKey)?.cashSafe ?? 0) : 0;
      const safeCash = cashSafeCalc(cashEnd, prevSafe, fakeEntry.cash_to_boss);

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
      setModalDay(null);
      toast.success("Entry saved");
    } finally {
      setModalSaving(false);
    }
  }

  async function handleModalDelete() {
    if (!modalDay) return;
    const entry = entryMap.get(isoDate(year, month, modalDay));
    if (!entry) return;
    const res = await fetch(`/api/accounting/entries/${entry.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    onEntryDelete(entry.id);
    setModalDay(null);
    toast.success("Entry deleted");
  }

  // ── Totals row ─────────────────────────────────────────────────────────────

  const totalsEntry = entries.reduce<DailyEntry>((acc, e) => {
    for (const key of Object.keys(EMPTY_ENTRY) as Array<keyof typeof EMPTY_ENTRY>) {
      if (key === "notes" || key === "cash_safe_is_override") continue;
      (acc as unknown as Record<string, number>)[key] += (e[key] as number);
    }
    return acc;
  }, { ...EMPTY_ENTRY, id: "", organization_id: "", location_id: "", entry_date: "", notes: null, created_at: "", updated_at: "" } as unknown as DailyEntry);

  const locationName = locations.find((l) => l.id === locationId)?.name ?? "";

  return (
    <div className="flex flex-col gap-3">
      {/* Section sub-tabs */}
      <div className="flex rounded-md border border-border overflow-hidden text-xs w-fit">
        {SECTION_TABS.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 ${i > 0 ? "border-l border-border" : ""} ${
              activeTab === tab.id
                ? `${tab.activeClass} font-medium`
                : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="text-xs border-collapse" style={{ tableLayout: "auto" }}>
          <thead>
            {/* Section color band row */}
            {activeTab === "full" ? (
              <tr>
                {/* Sticky corner — solid background so scrolled body cells don't bleed through */}
                <th className={`sticky left-0 z-20 border-b border-border ${CELL_BORDER} w-24 min-w-[6rem]`}
                  style={{ background: "var(--background)" }} />
                {DAILY_ENTRY_SECTIONS.map((section) => (
                  <th
                    key={section.id}
                    colSpan={section.fields.length}
                    className={`text-center text-[10px] font-semibold py-1 px-2 border-b border-l-2 border-border/50 whitespace-nowrap ${section.headerClass}`}
                  >
                    {section.label}
                  </th>
                ))}
              </tr>
            ) : (
              <tr>
                <th className={`sticky left-0 z-20 py-1 px-2 ${CELL_BORDER} w-24 min-w-[6rem] ${currentSectionMeta.headerClass}`}
                  style={{ background: "var(--background)" }} />
                <th
                  colSpan={fields.length}
                  className={`py-1.5 px-3 text-left text-[10px] font-semibold tracking-wide ${CELL_BORDER} ${currentSectionMeta.headerClass}`}
                >
                  {currentSectionMeta.label}
                </th>
              </tr>
            )}

            {/* Column headers — border-b separates them from first data row */}
            <tr className="bg-muted/40 border-b-2 border-border">
              <th className={`px-2 py-2 text-left font-medium text-muted-foreground sticky left-0 z-20 whitespace-nowrap ${CELL_BORDER} w-24 min-w-[6rem]`}
                style={{ background: "var(--background)" }}>
                Day
              </th>
              {fields.map((f, i) => {
                const isSectionStart = activeTab === "full" && sectionBorderIndexes.has(i);
                return (
                  <th
                    key={String(f.key)}
                    className={`px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap ${CELL_BORDER} min-w-[5rem] ${f.calculated ? `italic text-muted-foreground/60 ${CALC_BG}` : ""} ${isSectionStart ? "border-l-2 border-border/50" : ""}`}
                  >
                    {f.shortLabel}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
              const date = isoDate(year, month, day);
              const entry = entryMap.get(date);
              const isToday = date === todayStr;
              const rowState = getRowState(date, entry, todayStr);
              const isSaving = savingDay === day;
              const computed = computedValues.get(date);
              const weekday = weekdayShort(year, month, day);
              const isEditingRow = editingCell?.day === day;

              // Sticky date cell background: always solid.
              // Highlight row when a cell in it is being edited; "today" and "mismatch" rows use slightly
              // stronger tints so the cell stays readable when scrolling under the frozen column.
              const stickyBg = isEditingRow
                ? "bg-accent text-accent-foreground"
                : isToday
                  ? "bg-muted/25"
                  : rowState === "mismatch" && entry
                    ? "bg-destructive/[12%]"
                    : "";

              return (
                <tr
                  key={day}
                  className={`border-b border-border/30 transition-colors group ${isToday ? "bg-muted/10" : ""} ${rowState === "mismatch" && entry ? "bg-destructive/5" : ""}`}
                >
                  {/* Sticky date cell — always opaque via inline style */}
                  <td
                    className={`px-2 py-1.5 font-medium whitespace-nowrap sticky left-0 z-20 ${CELL_BORDER} w-24 min-w-[6rem] transition-colors ${stickyBg}`}
                    style={isEditingRow ? undefined : { background: "var(--background)" }}
                  >
                    <button
                      type="button"
                      onClick={() => openModal(day)}
                      className="hover:underline focus:outline-none flex items-center gap-1 tabular-nums"
                      title="Open full editor"
                    >
                      <span className={`text-[9px] flex-none ${ROW_STATE_DOT[rowState]}`} title={rowState}>●</span>
                      <span className="text-muted-foreground/50 text-[10px] w-6 text-right inline-block">{weekday}</span>
                      <span className="w-5 text-right">{String(day).padStart(2, "0")}</span>
                      {isSaving && <Loader2Icon className="size-2.5 animate-spin text-muted-foreground" />}
                    </button>
                    {isToday && <span className="block text-[9px] text-muted-foreground leading-none mt-0.5 pl-4">today</span>}
                  </td>

                  {/* Data cells — each Cell IS the <td> */}
                  {fields.map((f, i) => {
                    const isEditingThis = editingCell?.day === day && editingCell?.field === f.key;
                    const isSectionStart = activeTab === "full" && sectionBorderIndexes.has(i);
                    const overrideValue =
                      f.key === "cash_end_day" ? computed?.cashEndDay :
                      f.key === "cash_safe"    ? computed?.cashSafe   : undefined;
                    return (
                      <Cell
                        key={String(f.key)}
                        entry={entry}
                        fieldKey={f.key}
                        calculated={f.calculated}
                        isEditing={isEditingThis}
                        editValue={editValue}
                        day={day}
                        overrideValue={overrideValue}
                        extraClass={isSectionStart ? "border-l-2 border-border/50" : ""}
                        isOverrideable={f.key === "cash_safe"}
                        onStartEdit={startEdit}
                        onEditChange={setEditValue}
                        onEditCommit={() => void commitEdit()}
                        onEditKeyDown={handleKeyDown}
                        onRequestOverride={openOverride}
                      />
                    );
                  })}
                </tr>
              );
            })}

            {/* Totals row */}
            {entries.length > 0 && (
              <tr className="font-semibold border-t-2 border-border">
                <td className={`px-2 py-2 text-xs sticky left-0 z-20 ${CELL_BORDER}`}
                  style={{ background: "var(--background)" }}>
                  Total
                </td>
                {fields.map((f, i) => {
                  const isSectionStart = activeTab === "full" && sectionBorderIndexes.has(i);
                  const value = f.key === "cash_end_day"
                    ? entries.reduce((s, e) => s + cashEndDayCalc(e), 0)
                    : f.key === "cash_safe"
                      ? (computedValues.get(isoDate(year, month, days))?.cashSafe ?? 0)
                      : resolveField(totalsEntry, f.key);
                  const isDelta = f.key === "__payment_delta__";
                  const deltaClass = isDelta && Math.abs(value) > 50 ? "text-destructive" : "";
                  return (
                    <td
                      key={String(f.key)}
                      className={`px-3 py-2 text-right text-xs tabular-nums ${CELL_BORDER} ${f.calculated ? CALC_BG : ""} ${deltaClass} ${isSectionStart ? "border-l-2 border-border/50" : ""}`}
                    >
                      {isDelta ? fmtSigned(value) : fmt(value)}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>

        {loading && <div className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No entries yet. Click a day or any cell to start.
          </div>
        )}
      </div>

      {/* Cash safe override confirmation modal */}
      {overrideModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Override cash safe</h2>
              <button onClick={() => setOverrideModal(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {isoDate(year, month, overrideModal.day)} — computed value: <strong>{fmt(overrideModal.currentValue) || "0"}</strong>
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
              This will override the automatic calculation and affect all subsequent days in the chain.
            </p>
            <div className="flex flex-col gap-1 mb-4">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">New value</label>
              <input
                type="number"
                step="0.01"
                autoFocus
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void confirmOverride(); if (e.key === "Escape") setOverrideModal(null); }}
                className="h-8 rounded border border-border bg-muted/30 px-3 text-sm text-right focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setOverrideModal(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" disabled={overrideSaving} onClick={() => void confirmOverride()}>
                {overrideSaving ? "Saving…" : "Override"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Entry modal — opens on the same section tab the user was viewing */}
      {modalDay !== null && (
        <DailyEntryModal
          date={isoDate(year, month, modalDay)}
          locationName={locationName}
          form={modalForm}
          saving={modalSaving}
          existingId={entryMap.get(isoDate(year, month, modalDay))?.id}
          computedCashEndDay={computedValues.get(isoDate(year, month, modalDay))?.cashEndDay}
          computedCashSafe={computedValues.get(isoDate(year, month, modalDay))?.cashSafe}
          initialSection={activeTab !== "full" ? activeTab : undefined}
          onChange={(field, val) => setModalForm((f) => ({ ...f, [field]: val }))}
          onSave={(e) => void handleModalSave(e)}
          onDelete={() => void handleModalDelete()}
          onClose={() => setModalDay(null)}
        />
      )}
    </div>
  );
}
