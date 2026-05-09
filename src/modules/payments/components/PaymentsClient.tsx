"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, CalculatorIcon, CheckIcon, BanknoteIcon, BuildingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PaymentRecord, type PaymentStatus, totalPayment, STATUS_LABELS, STATUS_COLORS } from "@/modules/payments/types";
import type { Employee, AdminLocation } from "@/modules/admin/types";

interface CalcResult {
  employee_id: string;
  employee_name: string;
  base_salary: number;
  overtime_pay: number;
  service_charge: number;
  payment_method: "bank_transfer" | "cash";
}

interface Props {
  initialLocations: AdminLocation[];
}

function fmtThb(n: number) {
  return `฿${Math.round(n).toLocaleString()}`;
}

type EditableField = "bonus_amount" | "bonus_note" | "deductions" | "deduction_note" | "notes";

export function PaymentsClient({ initialLocations }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [locationId, setLocationId] = useState(initialLocations[0]?.id ?? "");

  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Inline editing for bonus/deductions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });

  const loadData = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const [recRes, empRes] = await Promise.all([
        fetch(`/api/payments?year=${year}&month=${month}&location_id=${encodeURIComponent(locationId)}`),
        fetch("/api/admin/employees"),
      ]);
      const recData = await recRes.json();
      const empData = await empRes.json();
      setRecords(Array.isArray(recData) ? recData as PaymentRecord[] : []);
      setEmployees(Array.isArray(empData) ? empData as Employee[] : []);
    } finally {
      setLoading(false);
    }
  }, [locationId, year, month]);

  useEffect(() => { void loadData(); }, [loadData]);

  const locationEmployees = useMemo(() =>
    employees.filter((e) =>
      !e.archived_at && (
        e.employee_locations?.some((el) => el.location_id === locationId) ||
        e.location_id === locationId
      )
    ),
    [employees, locationId]
  );

  // Merge employees with their payment records
  const rows = useMemo(() =>
    locationEmployees.map((emp) => ({
      employee: emp,
      record: records.find((r) => r.employee_id === emp.id) ?? null,
    })),
    [locationEmployees, records]
  );

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  async function handleCalculate() {
    if (!locationId) return;
    setCalculating(true);
    try {
      const calcRes = await fetch("/api/payments/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_year: year, period_month: month, location_id: locationId }),
      });
      if (!calcRes.ok) {
        const err = await calcRes.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Calculation failed");
        return;
      }
      const calcData = await calcRes.json() as CalcResult[];

      // Upsert payment records for each employee
      await Promise.all(calcData.map(async (c) => {
        const existing = records.find((r) => r.employee_id === c.employee_id);
        await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location_id: locationId,
            employee_id: c.employee_id,
            period_year: year,
            period_month: month,
            base_salary: c.base_salary,
            overtime_pay: c.overtime_pay,
            service_charge: c.service_charge,
            bonus_amount: existing?.bonus_amount ?? 0,
            bonus_note: existing?.bonus_note ?? null,
            deductions: existing?.deductions ?? 0,
            deduction_note: existing?.deduction_note ?? null,
            payment_method: c.payment_method,
            status: existing?.status ?? "draft",
            notes: existing?.notes ?? null,
          }),
        });
      }));

      toast.success("Calculations applied");
      await loadData();
    } finally {
      setCalculating(false);
    }
  }

  async function patchRecord(id: string, patch: Partial<PaymentRecord>) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to save"); return;
      }
      const updated = await res.json() as PaymentRecord;
      setRecords((prev) => prev.map((r) => r.id === id ? updated : r));
      setEditingId(null); setEditField(null);
    } finally {
      setSavingId(null);
    }
  }

  async function setStatus(record: PaymentRecord, status: PaymentStatus) {
    await patchRecord(record.id, { status });
  }

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.record);
    return {
      base: paid.reduce((s, r) => s + (r.record?.base_salary ?? 0), 0),
      ot: paid.reduce((s, r) => s + (r.record?.overtime_pay ?? 0), 0),
      sc: paid.reduce((s, r) => s + (r.record?.service_charge ?? 0), 0),
      bonus: paid.reduce((s, r) => s + (r.record?.bonus_amount ?? 0), 0),
      deductions: paid.reduce((s, r) => s + (r.record?.deductions ?? 0), 0),
      total: paid.reduce((s, r) => s + (r.record ? totalPayment(r.record) : 0), 0),
    };
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly employee payment summary</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm"
          >
            {initialLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={prevMonth}>
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="text-sm font-medium w-36 text-center tabular-nums">{monthName}</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={nextMonth}>
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => void handleCalculate()} disabled={calculating || !locationId}
          >
            {calculating ? <Loader2Icon className="size-4 animate-spin" /> : <CalculatorIcon className="size-4" />}
            Calculate period
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin mr-2" />Loading…
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40">Employee</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Base salary</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">OT pay</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Service charge</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Bonus</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Deductions</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Method</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {employees.length === 0
                      ? <><a href="/dashboard/admin/employees" className="underline hover:text-foreground">Add your first employee</a> to start tracking payments.</>
                      : <>No employees assigned to this location. Assign employees, then use <strong>Calculate period</strong> to generate records.</>}
                  </td>
                </tr>
              ) : rows.map(({ employee: emp, record }) => {
                const isBankTransfer = record?.payment_method === "bank_transfer" || emp.has_thai_bank_account;
                const rowBg = isBankTransfer ? "bg-blue-50/40 dark:bg-blue-950/20" : "bg-amber-50/20 dark:bg-amber-950/10";
                const total = record ? totalPayment(record) : 0;
                return (
                  <tr key={emp.id} className={`transition-colors ${rowBg} hover:brightness-[0.97]`}>
                    <td className={`px-4 py-2.5 font-medium sticky left-0 ${rowBg}`}>
                      {emp.first_name} {emp.last_name}
                      {!emp.base_salary_monthly && (
                        <span className="ml-1.5 text-[10px] text-amber-600">no salary set</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? fmtThb(record.base_salary) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? (record.overtime_pay > 0 ? <span className="text-blue-600 dark:text-blue-400">{fmtThb(record.overtime_pay)}</span> : "—") : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? (record.service_charge > 0 ? fmtThb(record.service_charge) : "—") : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    {/* Bonus — inline editable */}
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? (
                        editingId === record.id && editField === "bonus_amount" ? (
                          <input
                            type="number" min="0" step="100" autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => void patchRecord(record.id, { bonus_amount: parseFloat(editValue) || 0 })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void patchRecord(record.id, { bonus_amount: parseFloat(editValue) || 0 });
                              if (e.key === "Escape") { setEditingId(null); setEditField(null); }
                            }}
                            className="w-24 h-6 text-right text-xs rounded border border-ring bg-background px-1 focus:outline-none"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => { setEditingId(record.id); setEditField("bonus_amount"); setEditValue(String(record.bonus_amount)); }}
                          >
                            {record.bonus_amount > 0 ? <span className="text-emerald-600 dark:text-emerald-400">{fmtThb(record.bonus_amount)}</span> : <span className="text-muted-foreground/30 text-[10px]">+ add</span>}
                          </span>
                        )
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    {/* Deductions — inline editable */}
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? (
                        editingId === record.id && editField === "deductions" ? (
                          <input
                            type="number" min="0" step="100" autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => void patchRecord(record.id, { deductions: parseFloat(editValue) || 0 })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void patchRecord(record.id, { deductions: parseFloat(editValue) || 0 });
                              if (e.key === "Escape") { setEditingId(null); setEditField(null); }
                            }}
                            className="w-24 h-6 text-right text-xs rounded border border-ring bg-background px-1 focus:outline-none"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => { setEditingId(record.id); setEditField("deductions"); setEditValue(String(record.deductions)); }}
                          >
                            {record.deductions > 0 ? <span className="text-destructive">{fmtThb(record.deductions)}</span> : <span className="text-muted-foreground/30 text-[10px]">+ add</span>}
                          </span>
                        )
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {record ? fmtThb(total) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isBankTransfer
                        ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><BuildingIcon className="size-2.5" />Bank</span>
                        : <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><BanknoteIcon className="size-2.5" />Cash</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {record ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[record.status]}`}>
                          {STATUS_LABELS[record.status]}
                        </span>
                      ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {record && record.status !== "paid" && (
                        <div className="flex justify-end gap-1">
                          {savingId === record.id ? (
                            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                          ) : record.status === "draft" ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-blue-700 border-blue-300"
                              onClick={() => void setStatus(record, "confirmed")}>
                              <CheckIcon className="size-3" />Confirm
                            </Button>
                          ) : (
                            <Button size="sm" className="h-7 text-xs gap-1 bg-green-700 hover:bg-green-800"
                              onClick={() => void setStatus(record, "paid")}>
                              <CheckIcon className="size-3" />Mark paid
                            </Button>
                          )}
                        </div>
                      )}
                      {record?.status === "paid" && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {record.paid_at ? new Date(record.paid_at).toLocaleDateString("en", { day: "numeric", month: "short" }) : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {rows.some((r) => r.record) && (
              <tfoot className="border-t-2 border-border bg-muted/20">
                <tr className="font-semibold">
                  <td className="px-4 py-2.5 text-xs sticky left-0 bg-muted/20">Total</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{fmtThb(totals.base)}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{totals.ot > 0 ? fmtThb(totals.ot) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{totals.sc > 0 ? fmtThb(totals.sc) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{totals.bonus > 0 ? fmtThb(totals.bonus) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{totals.deductions > 0 ? fmtThb(totals.deductions) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtThb(totals.total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Blue rows = bank transfer (Thai bank account) · Amber rows = cash · Service charge = 1% of location net revenue shared equally among employees.
      </p>
    </div>
  );
}
