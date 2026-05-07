"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fixedExpenseTotal,
  type MonthlyFixedExpense,
  type FixedExpenseCategory,
} from "@/modules/accounting/types";
import type { AdminLocation } from "@/modules/admin/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number) {
  return n === 0 ? "" : n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface Props {
  locationId: string;
  locations: AdminLocation[];
}

export function MonthlyFixedExpensesTable({ locationId, locations }: Props) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [categories, setCategories] = useState<FixedExpenseCategory[]>([]);
  const [rows, setRows] = useState<MonthlyFixedExpense[]>([]);
  const [loading, setLoading] = useState(false);

  // Inline cell editing
  const [editingCell, setEditingCell] = useState<{ month: number; catKey: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingMonth, setSavingMonth] = useState<number | null>(null);

  // Month modal (full month edit)
  const [modalMonth, setModalMonth] = useState<number | null>(null);
  const [modalForm, setModalForm] = useState<Record<string, string>>({});
  const [modalSaving, setModalSaving] = useState(false);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/accounting/fixed-expense-categories");
    if (!res.ok) return;
    const json = await res.json() as { categories: FixedExpenseCategory[] };
    setCategories(json.categories.sort((a, b) => a.sort_order - b.sort_order));
  }, []);

  // Fetch rows
  const fetchRows = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/fixed-expenses?location_id=${locationId}&year=${year}`);
      if (!res.ok) return;
      const json = await res.json() as { rows: MonthlyFixedExpense[] };
      setRows(json.rows);
    } finally {
      setLoading(false);
    }
  }, [locationId, year]);

  useEffect(() => { void fetchCategories(); }, [fetchCategories]);
  useEffect(() => { void fetchRows(); }, [fetchRows]);

  const rowMap = new Map<number, MonthlyFixedExpense>();
  for (const r of rows) rowMap.set(r.month, r);

  // ── Save helpers ────────────────────────────────────────────────────────────

  async function saveMonthData(monthNum: number, catValues: Record<string, number>) {
    setSavingMonth(monthNum);
    try {
      const res = await fetch("/api/accounting/fixed-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location_id: locationId, year, month: monthNum, category_values: catValues }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Save failed");
        return null;
      }
      const saved = await res.json() as MonthlyFixedExpense;
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.month === saved.month);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [...prev, saved].sort((a, b) => a.month - b.month);
      });
      return saved;
    } finally {
      setSavingMonth(null);
    }
  }

  // ── Inline cell edit ────────────────────────────────────────────────────────

  async function commitEdit() {
    if (!editingCell) return;
    const { month: monthNum, catKey } = editingCell;
    setEditingCell(null);
    const numVal = parseFloat(editValue) || 0;
    const existing = rowMap.get(monthNum);
    const base: Record<string, number> = {};
    for (const cat of categories) {
      base[cat.key] = existing ? (existing.category_values?.[cat.key] ?? 0) : 0;
    }
    base[catKey] = numVal;
    await saveMonthData(monthNum, base);
  }

  // ── Month modal ─────────────────────────────────────────────────────────────

  function openModal(monthNum: number) {
    const row = rowMap.get(monthNum);
    const form: Record<string, string> = {};
    for (const cat of categories) {
      form[cat.key] = row ? String(row.category_values?.[cat.key] ?? 0) : "0";
    }
    setModalForm(form);
    setModalMonth(monthNum);
  }

  async function handleModalSave(e: React.FormEvent) {
    e.preventDefault();
    if (!modalMonth) return;
    setModalSaving(true);
    const catValues: Record<string, number> = {};
    for (const cat of categories) {
      catValues[cat.key] = parseFloat(modalForm[cat.key] ?? "0") || 0;
    }
    const saved = await saveMonthData(modalMonth, catValues);
    setModalSaving(false);
    if (saved) {
      setModalMonth(null);
      toast.success("Saved");
    }
  }

  // ── Column totals ───────────────────────────────────────────────────────────

  const catTotals: Record<string, number> = {};
  for (const cat of categories) {
    catTotals[cat.key] = rows.reduce((s, r) => s + (r.category_values?.[cat.key] ?? 0), 0);
  }
  const grandTotal = rows.reduce((s, r) => s + fixedExpenseTotal(r), 0);

  const locationName = locations.find((l) => l.id === locationId)?.name ?? "";

  return (
    <div className="flex flex-col gap-4">
      {/* Year navigation + admin actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="text-sm font-semibold w-12 text-center">{year}</span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setYear((y) => y + 1)}>
            <ChevronRightIcon className="size-4" />
          </Button>
          {locationName && <span className="text-xs text-muted-foreground">— {locationName}</span>}
        </div>

      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="text-xs border-collapse" style={{ tableLayout: "auto" }}>
          <thead>
            {/* Spanning section header */}
            <tr>
              <th
                colSpan={categories.length + 2}
                className="px-3 py-1.5 text-left text-[10px] font-semibold tracking-wide border-b border-slate-500/20"
                style={{ background: "color-mix(in oklch, var(--color-slate-500, #64748b) 12%, transparent)", color: "color-mix(in oklch, var(--color-slate-500, #64748b) 80%, var(--foreground))" }}
              >
                Monthly Fixed Expenses
              </th>
            </tr>

            {/* Column headers — border-b-2 separates headers from first data row */}
            <tr className="bg-muted/40 border-b-2 border-border">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground sticky left-0 z-10 whitespace-nowrap border-r border-border/20 w-28 min-w-[7rem]"
                style={{ background: "var(--background)" }}>
                Month
              </th>
              {categories.map((cat) => (
                <th
                  key={cat.key}
                  className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border/20 min-w-[5rem]"
                >
                  {cat.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-medium text-muted-foreground/60 italic border-r border-border/20 bg-slate-500/[0.07] dark:bg-slate-400/[0.07] min-w-[5rem]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {MONTH_NAMES.map((monthName, idx) => {
              const monthNum = idx + 1;
              const row = rowMap.get(monthNum);
              const isSaving = savingMonth === monthNum;
              const total = row ? fixedExpenseTotal(row) : 0;
              const isEditingRow = editingCell?.month === monthNum;

              return (
                <tr key={monthNum} className="transition-colors">
                  {/* Month cell — click opens modal */}
                  <td
                    className={`px-3 py-2 sticky left-0 z-10 whitespace-nowrap border-r border-border/20 w-28 min-w-[7rem] transition-colors ${isEditingRow ? "bg-accent text-accent-foreground" : ""}`}
                    style={isEditingRow ? undefined : { background: "var(--background)" }}
                  >
                    <button
                      type="button"
                      onClick={() => openModal(monthNum)}
                      className="font-medium hover:underline focus:outline-none"
                      title="Edit all expenses for this month"
                    >
                      {monthName}
                    </button>
                    {isSaving && <Loader2Icon className="inline ml-1.5 size-2.5 animate-spin text-muted-foreground" />}
                  </td>

                  {categories.map((cat) => {
                    const isEditing = editingCell?.month === monthNum && editingCell?.catKey === cat.key;
                    const val = row ? (row.category_values?.[cat.key] ?? 0) : 0;

                    if (isEditing) {
                      return (
                        <td key={cat.key} className="px-3 h-8 text-right border-r border-border/20 min-w-[5rem]">
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => void commitEdit()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); void commitEdit(); }
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full h-full rounded border border-ring bg-background px-0.5 text-xs text-right focus:outline-none"
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={cat.key}
                        className="px-3 h-8 text-right tabular-nums cursor-pointer hover:bg-accent/20 hover:ring-1 hover:ring-inset hover:ring-border/60 transition-all select-none border-r border-border/20 min-w-[5rem]"
                        onClick={() => {
                          setEditingCell({ month: monthNum, catKey: cat.key });
                          setEditValue(val === 0 ? "" : String(val));
                        }}
                      >
                        {fmt(val)}
                      </td>
                    );
                  })}

                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground/70 italic border-r border-border/20 bg-slate-500/[0.07] dark:bg-slate-400/[0.07] min-w-[5rem]">
                    {fmt(total)}
                  </td>
                </tr>
              );
            })}

            {/* Column totals row */}
            <tr className="bg-muted/30 font-semibold border-t-2 border-border">
              <td className="px-3 py-2 text-xs sticky left-0 z-10 border-r border-border/20"
                style={{ background: "var(--background)" }}>Total</td>
              {categories.map((cat) => (
                <td key={cat.key} className="px-3 py-2 text-right text-xs tabular-nums border-r border-border/20">
                  {fmt(catTotals[cat.key] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground/70 italic border-r border-border/20 bg-slate-500/[0.07] dark:bg-slate-400/[0.07]">
                {fmt(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {loading && <div className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</div>}
        {!loading && rows.length === 0 && categories.length > 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">No fixed expenses for {year}</p>
            <p className="text-xs">Click a month name or any cell to start.</p>
          </div>
        )}
        {!loading && categories.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">No categories configured</p>
            <p className="text-xs">Categories are managed at company level.</p>
          </div>
        )}
      </div>

      {/* Month modal */}
      {modalMonth !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">{MONTH_NAMES[modalMonth - 1]} {year}</h2>
                <p className="text-xs text-muted-foreground">Fixed expenses — {locationName}</p>
              </div>
              <button onClick={() => setModalMonth(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleModalSave(e)} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {categories.map((cat) => (
                  <div key={cat.key} className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {cat.label}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalForm[cat.key] ?? "0"}
                      onChange={(e) => setModalForm((f) => ({ ...f, [cat.key]: e.target.value }))}
                      className="h-7 rounded border border-border bg-muted/30 px-2 text-xs text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>

              {/* Live total */}
              <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Month total</span>
                <span className="font-semibold tabular-nums">
                  {fmt(categories.reduce((s, c) => s + (parseFloat(modalForm[c.key] ?? "0") || 0), 0))}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={() => setModalMonth(null)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={modalSaving}>{modalSaving ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
