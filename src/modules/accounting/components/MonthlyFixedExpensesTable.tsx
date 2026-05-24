"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, XIcon, PlusIcon, Trash2Icon, SettingsIcon } from "lucide-react";
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
  canManageCategories?: boolean;
}

export function MonthlyFixedExpensesTable({ locationId, locations, canManageCategories }: Props) {
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

  // Category management
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);

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

  // ── Category management ──────────────────────────────────────────────────────

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const label = newCatLabel.trim();
    if (!label) return;
    setAddingCat(true);
    try {
      const res = await fetch("/api/accounting/fixed-expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to add category");
        return;
      }
      const cat = await res.json() as FixedExpenseCategory;
      setCategories((prev) => [...prev, cat].sort((a, b) => a.sort_order - b.sort_order));
      setNewCatLabel("");
      toast.success(`"${cat.label}" added`);
    } finally {
      setAddingCat(false);
    }
  }

  async function handleDeleteCategory(key: string, label: string) {
    setDeletingCat(key);
    try {
      const res = await fetch(`/api/accounting/fixed-expense-categories?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (!res.ok) { toast.error("Failed to remove category"); return; }
      setCategories((prev) => prev.filter((c) => c.key !== key));
      toast.success(`"${label}" removed`);
    } finally {
      setDeletingCat(null);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Year navigation + admin actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s-2)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
          <button
            style={{
              width: 28, height: 28,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
              background: "var(--surface)", color: "var(--fg-3)", cursor: "pointer",
            }}
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeftIcon style={{ width: 14, height: 14 }} />
          </button>
          <span className="mono tabular-nums" style={{ fontSize: 13, fontWeight: 500, width: 48, textAlign: "center", color: "var(--fg)" }}>
            {year}
          </span>
          <button
            style={{
              width: 28, height: 28,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
              background: "var(--surface)", color: "var(--fg-3)", cursor: "pointer",
            }}
            onClick={() => setYear((y) => y + 1)}
          >
            <ChevronRightIcon style={{ width: 14, height: 14 }} />
          </button>
          {locationName && <span style={{ fontSize: 12, color: "var(--fg-4)" }}>— {locationName}</span>}
        </div>
        {canManageCategories && (
          <button
            style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 28, padding: "0 10px",
              borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
              background: showCatManager ? "var(--bronze-soft)" : "var(--surface)",
              color: showCatManager ? "var(--bronze)" : "var(--fg-4)",
              fontSize: 12, cursor: "pointer",
              transition: "all var(--dur) var(--ease)",
            }}
            onClick={() => setShowCatManager((v) => !v)}
          >
            <SettingsIcon style={{ width: 13, height: 13 }} />
            Manage categories
          </button>
        )}
      </div>

      {/* Category manager panel */}
      {canManageCategories && showCatManager && (
        <div
          style={{
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            padding: "var(--s-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s-3)",
          }}
        >
          <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600 }}>Fixed Expense Categories — Company level</p>
          <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: -8 }}>
            These categories apply to all locations. Adding or removing a category updates all monthly tables immediately.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
            {categories.map((cat) => (
              <div
                key={cat.key}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                  background: "var(--bg-2)",
                  padding: "4px 10px",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 500, color: "var(--fg)" }}>{cat.label}</span>
                <button
                  type="button"
                  disabled={deletingCat === cat.key}
                  onClick={() => void handleDeleteCategory(cat.key, cat.label)}
                  style={{
                    color: "var(--fg-4)", background: "none", border: "none",
                    cursor: "pointer", lineHeight: 1, opacity: deletingCat === cat.key ? 0.3 : 1,
                    transition: "color var(--dur) var(--ease)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bad)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                  title={`Remove "${cat.label}"`}
                >
                  {deletingCat === cat.key
                    ? <Loader2Icon style={{ width: 12, height: 12 }} className="animate-spin" />
                    : <Trash2Icon style={{ width: 12, height: 12 }} />}
                </button>
              </div>
            ))}
            {categories.length === 0 && <p style={{ fontSize: 12, color: "var(--fg-4)" }}>No categories yet.</p>}
          </div>
          <form onSubmit={(e) => void handleAddCategory(e)} style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            <input
              type="text"
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="New category name…"
              style={{
                height: 32, flex: 1, maxWidth: 280,
                borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                background: "var(--bg-2)", padding: "0 var(--s-3)",
                fontSize: 13, color: "var(--fg)", outline: "none",
              }}
            />
            <Button type="submit" size="sm" disabled={addingCat || !newCatLabel.trim()} style={{ gap: 6 }}>
              <PlusIcon style={{ width: 13, height: 13 }} />
              {addingCat ? "Adding…" : "Add"}
            </Button>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflowX: "auto" }}>
        <table className="text-xs border-collapse" style={{ tableLayout: "auto" }}>
          <thead>
            {/* Section header band */}
            <tr>
              <th
                colSpan={categories.length + 2}
                style={{
                  padding: "6px 12px",
                  textAlign: "left",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--line)",
                  background: "var(--bronze-soft)",
                  color: "var(--bronze)",
                }}
              >
                Monthly Fixed Expenses
              </th>
            </tr>

            {/* Column headers */}
            <tr style={{ borderBottom: "2px solid var(--line)", background: "var(--bg-2)" }}>
              <th
                className="sticky left-0 z-10 whitespace-nowrap"
                style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--fg-4)",
                  borderRight: "1px solid var(--line)",
                  width: "7rem", minWidth: "7rem",
                  background: "var(--bg-2)",
                }}
              >
                Month
              </th>
              {categories.map((cat) => (
                <th
                  key={cat.key}
                  style={{
                    padding: "10px 12px",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--fg-4)",
                    borderRight: "1px solid var(--line)",
                    minWidth: "5rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.label}
                </th>
              ))}
              <th
                style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--fg-4)",
                  fontStyle: "italic",
                  borderRight: "1px solid var(--line)",
                  background: "var(--bg-2)",
                  minWidth: "5rem",
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {MONTH_NAMES.map((monthName, idx) => {
              const monthNum = idx + 1;
              const row = rowMap.get(monthNum);
              const isSaving = savingMonth === monthNum;
              const total = row ? fixedExpenseTotal(row) : 0;
              const isEditingRow = editingCell?.month === monthNum;

              return (
                <tr
                  key={monthNum}
                  style={{ borderBottom: "1px solid var(--line)", transition: "background var(--dur) var(--ease)" }}
                >
                  {/* Month cell */}
                  <td
                    className="sticky left-0 z-10 whitespace-nowrap"
                    style={{
                      padding: "8px 12px",
                      borderRight: "1px solid var(--line)",
                      width: "7rem", minWidth: "7rem",
                      background: isEditingRow ? "var(--bronze-soft)" : "var(--surface)",
                      transition: "background var(--dur) var(--ease)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openModal(monthNum)}
                      style={{
                        fontSize: 12, fontWeight: 500,
                        color: "var(--fg)", background: "none", border: "none",
                        cursor: "pointer", textDecoration: "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                      title="Edit all expenses for this month"
                    >
                      {monthName}
                    </button>
                    {isSaving && <Loader2Icon style={{ width: 10, height: 10, display: "inline", marginLeft: 6, color: "var(--fg-4)" }} className="animate-spin" />}
                  </td>

                  {categories.map((cat) => {
                    const isEditing = editingCell?.month === monthNum && editingCell?.catKey === cat.key;
                    const val = row ? (row.category_values?.[cat.key] ?? 0) : 0;

                    if (isEditing) {
                      return (
                        <td
                          key={cat.key}
                          className="mono tabular-nums"
                          style={{
                            padding: "0 12px",
                            height: 32,
                            textAlign: "right",
                            fontSize: 12,
                            borderRight: "1px solid var(--line)",
                            minWidth: "5rem",
                            position: "relative",
                          }}
                        >
                          <span aria-hidden="true" style={{ visibility: "hidden" }}>{fmt(val)}</span>
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => void commitEdit()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); void commitEdit(); }
                              if (e.key === "Escape") { setEditingCell(null); }
                              if (e.key === "Tab") {
                                e.preventDefault();
                                const catIdx = categories.findIndex((c) => c.key === cat.key);
                                const dir = e.shiftKey ? -1 : 1;
                                const nextIdx = catIdx + dir;
                                void commitEdit();
                                if (nextIdx >= 0 && nextIdx < categories.length) {
                                  const nextCat = categories[nextIdx];
                                  const existing = rowMap.get(monthNum);
                                  const nextVal = existing ? (existing.category_values?.[nextCat.key] ?? 0) : 0;
                                  setEditingCell({ month: monthNum, catKey: nextCat.key });
                                  setEditValue(nextVal === 0 ? "" : String(nextVal));
                                }
                              }
                            }}
                            style={{
                              position: "absolute", inset: 0,
                              paddingInline: "var(--s-2)",
                              height: "100%", width: "100%",
                              border: "1px solid var(--focus-ring)",
                              background: "var(--surface)",
                              fontSize: 12,
                              textAlign: "right",
                              outline: "none",
                            }}
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={cat.key}
                        className="mono tabular-nums"
                        style={{
                          padding: "0 12px",
                          height: 32,
                          textAlign: "right",
                          fontSize: 12,
                          cursor: "pointer",
                          borderRight: "1px solid var(--line)",
                          minWidth: "5rem",
                          color: "var(--fg)",
                          userSelect: "none",
                          transition: "background var(--dur) var(--ease)",
                        }}
                        onClick={() => {
                          setEditingCell({ month: monthNum, catKey: cat.key });
                          setEditValue(val === 0 ? "" : String(val));
                        }}
                      >
                        {fmt(val)}
                      </td>
                    );
                  })}

                  <td
                    className="mono tabular-nums"
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontSize: 12,
                      color: "var(--fg-4)",
                      fontStyle: "italic",
                      borderRight: "1px solid var(--line)",
                      background: "var(--bg-2)",
                      minWidth: "5rem",
                    }}
                  >
                    {fmt(total)}
                  </td>
                </tr>
              );
            })}

            {/* Column totals row */}
            <tr style={{ borderTop: "2px solid var(--line)", background: "var(--bronze-soft)" }}>
              <td
                className="sticky left-0 z-10"
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--bronze)",
                  borderRight: "1px solid var(--line)",
                  background: "var(--bronze-soft)",
                }}
              >
                Total
              </td>
              {categories.map((cat) => (
                <td
                  key={cat.key}
                  className="mono tabular-nums"
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--fg)",
                    borderRight: "1px solid var(--line)",
                  }}
                >
                  {fmt(catTotals[cat.key] ?? 0)}
                </td>
              ))}
              <td
                className="mono tabular-nums"
                style={{
                  padding: "8px 12px",
                  textAlign: "right",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--bronze)",
                  fontStyle: "italic",
                  borderRight: "1px solid var(--line)",
                  background: "var(--bg-2)",
                }}
              >
                {fmt(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {loading && (
          <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "var(--fg-4)" }}>Loading…</div>
        )}
        {!loading && rows.length === 0 && categories.length > 0 && (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", marginBottom: 4 }}>No fixed expenses for {year}</p>
            <p style={{ fontSize: 12, color: "var(--fg-4)" }}>Click a month name or any cell to start.</p>
          </div>
        )}
        {!loading && categories.length === 0 && (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)", marginBottom: 4 }}>No categories configured</p>
            <p style={{ fontSize: 12, color: "var(--fg-4)" }}>Categories are managed at company level.</p>
          </div>
        )}
      </div>

      {/* Month modal */}
      {modalMonth !== null && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(43,35,27,0.55)",
            backdropFilter: "blur(2px)",
            padding: "var(--s-4)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%", maxWidth: 400,
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              padding: "var(--s-5)",
              boxShadow: "var(--shadow-2)",
              margin: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--s-4)" }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>{MONTH_NAMES[modalMonth - 1]} {year}</h2>
                <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>Fixed expenses — {locationName}</p>
              </div>
              <button
                onClick={() => setModalMonth(null)}
                style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
              >
                <XIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <form onSubmit={(e) => void handleModalSave(e)} style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--s-2) var(--s-4)" }}>
                {categories.map((cat) => (
                  <div key={cat.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label className="eyebrow" style={{ color: "var(--fg-4)" }}>{cat.label}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalForm[cat.key] ?? "0"}
                      onChange={(e) => setModalForm((f) => ({ ...f, [cat.key]: e.target.value }))}
                      className="mono tabular-nums"
                      style={{
                        height: 32,
                        borderRadius: "var(--r-sm)",
                        border: "1px solid var(--line)",
                        background: "var(--bg-2)",
                        padding: "0 var(--s-2)",
                        fontSize: 13,
                        textAlign: "right",
                        color: "var(--fg)",
                        outline: "none",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Live total */}
              <div
                style={{
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--line)",
                  background: "var(--bg-2)",
                  padding: "var(--s-2) var(--s-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--fg-4)" }}>Month total</span>
                <span className="mono tabular-nums" style={{ fontWeight: 600, color: "var(--fg)" }}>
                  {fmt(categories.reduce((s, c) => s + (parseFloat(modalForm[c.key] ?? "0") || 0), 0))}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--s-2)", paddingTop: 4 }}>
                <Button type="button" size="sm" variant="secondary" onClick={() => setModalMonth(null)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={modalSaving}>{modalSaving ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
