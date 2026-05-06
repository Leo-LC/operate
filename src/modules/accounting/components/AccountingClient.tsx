"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, XIcon, TrashIcon, DownloadIcon } from "lucide-react";
import { AccountingChart } from "@/modules/accounting/components/AccountingChart";
import {
  EMPTY_ENTRY,
  toFormState,
  fromFormState,
  salesNetTotal,
  salesIncVat,
  expCashTotal,
  expBankTotal,
  expTotal,
  hrTotal,
  paymentDelta,
  type DailyEntry,
  type EntryFormState,
} from "@/modules/accounting/types";
import type { AdminLocation } from "@/modules/admin/types";

function fmt(n: number) {
  return n === 0 ? "—" : n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtSigned(n: number) {
  if (n === 0) return "—";
  const s = n.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n > 0 ? `+${s}` : s;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Field sections ────────────────────────────────────────────────────────────
const SALES_FIELDS: Array<[keyof typeof EMPTY_ENTRY, string]> = [
  ["sales_drinks_net", "Drinks (net)"],
  ["sales_ticket_net", "Ticket (net)"],
  ["sales_snack_net", "Snacks (net)"],
  ["sales_goodies_net", "Goodies (net)"],
  ["sales_card_surcharge", "Card surcharge"],
];
const PAYMENT_FIELDS: Array<[keyof typeof EMPTY_ENTRY, string]> = [
  ["payment_cash", "Cash"],
  ["payment_scan", "Scan"],
  ["payment_credit_card", "Credit card"],
];
const EXP_CASH_FIELDS: Array<[keyof typeof EMPTY_ENTRY, string]> = [
  ["exp_staff_food_cash", "Staff food"],
  ["exp_drinks_cash", "Drinks"],
  ["exp_goodies_cash", "Goodies"],
  ["exp_animals_cash", "Animals"],
  ["exp_supply_cash", "Supply"],
  ["exp_boss_fees_cash", "Boss fees"],
  ["exp_other_cash", "Other"],
];
const EXP_BANK_FIELDS: Array<[keyof typeof EMPTY_ENTRY, string]> = [
  ["exp_makro_bank", "Makro"],
  ["exp_other_bank", "Other"],
];
const HR_FIELDS: Array<[keyof typeof EMPTY_ENTRY, string]> = [
  ["hr_salary_cash", "Salary cash"],
  ["hr_salary_bank", "Salary bank"],
  ["hr_challenge_cash", "Challenge"],
  ["hr_service_charge_cash", "Service charge"],
  ["hr_accompte_cash", "Acompte"],
];
const CASH_FIELDS: Array<[keyof typeof EMPTY_ENTRY, string]> = [
  ["cash_end_day", "Cash end of day"],
  ["cash_to_boss", "Cash to boss"],
  ["cash_safe", "Cash safe"],
];

function NumInput({ label, field, form, onChange }: {
  label: string;
  field: keyof typeof EMPTY_ENTRY;
  form: EntryFormState;
  onChange: (field: keyof typeof EMPTY_ENTRY, val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <input
        type="number"
        step="0.01"
        value={form[field] as string}
        onChange={(e) => onChange(field, e.target.value)}
        className="h-7 rounded border border-border bg-muted/30 px-2 text-xs text-right text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
      />
    </div>
  );
}

const SECTION_COLORS: Record<string, string> = {
  Sales:             "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Payments:          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Cash expenses":   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Bank expenses":   "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  HR:                "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "Cash tracking":   "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  const label = String(children);
  const color = SECTION_COLORS[label] ?? "bg-muted text-muted-foreground";
  return (
    <div className="col-span-full mt-3 mb-1 first:mt-0">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${color}`}>
        {children}
      </span>
    </div>
  );
}

interface AccountingClientProps {
  locations: AdminLocation[];
}

export function AccountingClient({ locations }: AccountingClientProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [fixedCost, setFixedCost] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [editDay, setEditDay] = useState<number | null>(null);
  const [form, setForm] = useState<EntryFormState>(toFormState({}));
  const [saving, setSaving] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const days = daysInMonth(year, month);
  const entryMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const e of entries) m.set(e.entry_date, e);
    return m;
  }, [entries]);

  const fetchEntries = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/entries?location_id=${locationId}&month=${monthStr}`);
      if (!res.ok) return;
      const json = await res.json() as { entries: DailyEntry[]; fixed_cost: { amount: number } | null };
      setEntries(json.entries);
      setFixedCost(json.fixed_cost?.amount ?? 0);
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

  function openEdit(day: number) {
    const date = isoDate(year, month, day);
    const existing = entryMap.get(date);
    setForm(toFormState(existing ?? {}));
    setEditDay(day);
  }

  function handleChange(field: keyof typeof EMPTY_ENTRY, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editDay || !locationId) return;
    setSaving(true);
    try {
      const payload = {
        location_id: locationId,
        entry_date: isoDate(year, month, editDay),
        ...fromFormState(form),
      };
      const res = await fetch("/api/accounting/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Save failed");
        return;
      }
      const saved = await res.json() as DailyEntry;
      setEntries((prev) => {
        const idx = prev.findIndex((en) => en.entry_date === saved.entry_date);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [...prev, saved].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
      });
      setEditDay(null);
      toast.success("Entry saved");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    const res = await fetch(`/api/accounting/entries/${entryId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    toast.success("Entry deleted");
  }

  // Monthly totals
  const totals = useMemo(() => {
    const zero = () => ({
      salesNet: 0, salesIncVat: 0,
      expCash: 0, expBank: 0, expTot: 0,
      hr: 0, cashToBoss: 0,
      payDelta: 0,
    });
    if (entries.length === 0) return zero();
    return entries.reduce((acc, e) => ({
      salesNet: acc.salesNet + salesNetTotal(e),
      salesIncVat: acc.salesIncVat + salesIncVat(e),
      expCash: acc.expCash + expCashTotal(e),
      expBank: acc.expBank + expBankTotal(e),
      expTot: acc.expTot + expTotal(e),
      hr: acc.hr + hrTotal(e),
      cashToBoss: acc.cashToBoss + e.cash_to_boss,
      payDelta: acc.payDelta + paymentDelta(e),
    }), zero());
  }, [entries]);

  const filled = entries.length;
  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeftIcon className="size-4" /></Button>
          <span className="text-base font-semibold w-44 text-center">{monthName}</span>
          <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRightIcon className="size-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filled}/{days} days filled</span>
          <a href={`/api/accounting/export?month=${monthStr}`} download>
            <Button size="sm" variant="outline" className="gap-1.5 h-8">
              <DownloadIcon className="size-3.5" />
              CSV
            </Button>
          </a>
        </div>
      </div>

      {/* KPI row */}
      {filled > 0 && (() => {
        const netProfit = totals.salesNet - totals.expTot - totals.hr - fixedCost;
        const margin = totals.salesNet > 0 ? (netProfit / totals.salesNet) * 100 : 0;
        const kpis = [
          { label: "Sales net", value: fmt(totals.salesNet), highlight: false },
          { label: "Expenses", value: fmt(totals.expTot + totals.hr + fixedCost), highlight: false },
          { label: "Net profit", value: fmt(netProfit), highlight: true, positive: netProfit >= 0 },
          { label: "Net margin", value: `${margin.toFixed(1)}%`, highlight: true, positive: margin >= 0 },
        ];
        return (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpis.map(({ label, value, highlight, positive }) => (
              <div key={label} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={`text-lg font-semibold ${highlight ? (positive ? "text-green-600 dark:text-green-400" : "text-destructive") : ""}`}>{value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Daily bar chart */}
      {filled > 2 && <AccountingChart entries={entries} year={year} month={month} />}

      {/* Day table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">Day</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sales net</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Inc VAT</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Exp cash</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Exp bank</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">HR</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">→ Boss</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Δ Pay</th>
              <th className="px-3 py-2 w-14" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
              const date = isoDate(year, month, day);
              const entry = entryMap.get(date);
              const isToday = date === today.toISOString().slice(0, 10);
              return (
                <tr
                  key={day}
                  onClick={() => openEdit(day)}
                  className={`hover:bg-muted/20 transition-colors group cursor-pointer ${isToday ? "bg-muted/10" : ""}`}
                >
                  <td className="px-3 py-1.5 font-medium">
                    {String(day).padStart(2, "0")}
                    {isToday && <span className="ml-1 text-[9px] text-muted-foreground">today</span>}
                  </td>
                  {entry ? (
                    <>
                      <td className="px-3 py-1.5 text-right">{fmt(salesNetTotal(entry))}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(salesIncVat(entry))}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(expCashTotal(entry))}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(expBankTotal(entry))}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(hrTotal(entry))}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(entry.cash_to_boss)}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${paymentDelta(entry) < -10 ? "text-[var(--destructive)]" : paymentDelta(entry) > 10 ? "text-[var(--success)]" : ""}`}>
                        {fmtSigned(paymentDelta(entry))}
                      </td>
                      <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => void handleDelete(entry.id)} className="rounded p-0.5 text-muted-foreground hover:text-destructive"><TrashIcon className="size-3" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td colSpan={7} className="px-3 py-1.5 text-muted-foreground/30 text-center text-[10px]">—</td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => openEdit(day)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground border border-dashed border-border/60 rounded px-1.5 py-0.5 hover:border-foreground hover:text-foreground"
                        >
                          Add
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {/* Totals row */}
            {filled > 0 && (
              <tr className="bg-muted/30 font-semibold border-t-2 border-border">
                <td className="px-3 py-2 text-xs">Total</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(totals.salesNet)}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(totals.salesIncVat)}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(totals.expCash)}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(totals.expBank)}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(totals.hr)}</td>
                <td className="px-3 py-2 text-right text-xs">{fmt(totals.cashToBoss)}</td>
                <td className={`px-3 py-2 text-right text-xs font-semibold ${totals.payDelta < -50 ? "text-[var(--destructive)]" : ""}`}>
                  {fmtSigned(totals.payDelta)}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
        {loading && <div className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</div>}
        {!loading && filled === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No entries for {monthName}. Hover a row and click Add to start.
          </div>
        )}
      </div>

      {/* Entry form modal */}
      {editDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-background p-5 shadow-xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">
                {isoDate(year, month, editDay)} — {locations.find((l) => l.id === locationId)?.name ?? ""}
              </h2>
              <button onClick={() => setEditDay(null)} className="text-muted-foreground hover:text-foreground"><XIcon className="size-4" /></button>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                <SectionTitle>Sales</SectionTitle>
                {SALES_FIELDS.map(([f, l]) => <NumInput key={f} field={f} label={l} form={form} onChange={handleChange} />)}

                <SectionTitle>Payments</SectionTitle>
                {PAYMENT_FIELDS.map(([f, l]) => <NumInput key={f} field={f} label={l} form={form} onChange={handleChange} />)}

                <SectionTitle>Cash expenses</SectionTitle>
                {EXP_CASH_FIELDS.map(([f, l]) => <NumInput key={f} field={f} label={l} form={form} onChange={handleChange} />)}

                <SectionTitle>Bank expenses</SectionTitle>
                {EXP_BANK_FIELDS.map(([f, l]) => <NumInput key={f} field={f} label={l} form={form} onChange={handleChange} />)}

                <SectionTitle>HR</SectionTitle>
                {HR_FIELDS.map(([f, l]) => <NumInput key={f} field={f} label={l} form={form} onChange={handleChange} />)}

                <SectionTitle>Cash tracking</SectionTitle>
                {CASH_FIELDS.map(([f, l]) => <NumInput key={f} field={f} label={l} form={form} onChange={handleChange} />)}
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
                />
              </div>

              {/* Live totals */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-lg bg-muted/30 px-3 py-2 text-xs mt-1">
                {(() => {
                  const preview = fromFormState(form) as unknown as DailyEntry;
                  return [
                    { label: "Sales net", value: fmt(salesNetTotal(preview)) },
                    { label: "Exp cash", value: fmt(expCashTotal(preview)) },
                    { label: "Exp bank", value: fmt(expBankTotal(preview)) },
                    { label: "HR", value: fmt(hrTotal(preview)) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className="font-semibold">{value}</p>
                    </div>
                  ));
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={() => setEditDay(null)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save entry"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
