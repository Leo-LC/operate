"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon, ChevronRightIcon, Loader2Icon, CalculatorIcon,
  CheckIcon, BanknoteIcon, BuildingIcon, PrinterIcon, XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PaymentRecord, type PaymentStatus, totalPayment, STATUS_LABELS, STATUS_COLORS } from "@/modules/payments/types";
import type { Employee, AdminLocation } from "@/modules/admin/types";
import { EmployeeForm, EMPTY_EMPLOYEE_FORM, type EmployeeFormState } from "@/modules/admin/components/EmployeeForm";

interface Props {
  initialLocations: AdminLocation[];
}

function fmtThb(n: number) {
  return `฿${Math.round(n).toLocaleString()}`;
}

type EditableField =
  | "bonus_amount" | "bonus_note"
  | "deductions" | "deduction_note"
  | "overtime_pay"
  | "service_charge"
  | "notes";

export function PaymentsClient({ initialLocations }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [locationId, setLocationId] = useState(initialLocations[0]?.id ?? "");

  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Employee modal (item 8)
  const [employeeModal, setEmployeeModal] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM);
  const [employeeLocIds, setEmployeeLocIds] = useState<Set<string>>(new Set());
  const [employeePrimaryLoc, setEmployeePrimaryLoc] = useState("");
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);

  // OT/Deductions edit modal (item 9)
  type EditModalState = { type: "ot" | "deduct"; record: PaymentRecord; emp: Employee } | null;
  const [editModal, setEditModal] = useState<EditModalState>(null);
  const [modalMode, setModalMode] = useState<"units" | "amount">("units");
  const [modalUnits, setModalUnits] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

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
      const res = await fetch("/api/payments/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_year: year, period_month: month, location_id: locationId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Calculation failed");
        return;
      }
      const saved = await res.json() as PaymentRecord[];
      setRecords(saved);
      toast.success("Calculations applied");
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

  function startEdit(recordId: string, field: EditableField, currentValue: string | number) {
    setEditingId(recordId);
    setEditField(field);
    setEditValue(String(currentValue));
  }

  function cancelEdit() { setEditingId(null); setEditField(null); }

  function openEmployeeModal(emp: Employee) {
    setEmployeeForm({
      first_name: emp.first_name,
      last_name: emp.last_name ?? "",
      position: emp.position ?? "",
      nationality: emp.nationality ?? "",
      national_id: emp.national_id ?? "",
      work_permit_number: emp.work_permit_number ?? "",
      work_permit_expires_at: emp.work_permit_expires_at ?? "",
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      notes: emp.notes ?? "",
      base_salary_monthly: emp.base_salary_monthly ? String(emp.base_salary_monthly) : "",
      has_thai_bank_account: emp.has_thai_bank_account ?? false,
      credit_note: emp.credit_note ?? "",
    });
    const locs = emp.employee_locations ?? [];
    setEmployeeLocIds(new Set(locs.map((el) => el.location_id)));
    const primaryLoc = locs.find((el) => el.is_primary);
    setEmployeePrimaryLoc(primaryLoc?.location_id ?? emp.location_id ?? "");
    setEmployeeModal(emp);
  }

  async function handleEmployeeSave(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeModal) return;
    setEmployeeSubmitting(true);
    try {
      const res = await fetch(`/api/admin/employees/${employeeModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...employeeForm,
          base_salary_monthly: employeeForm.base_salary_monthly ? parseFloat(employeeForm.base_salary_monthly) : null,
          location_ids: Array.from(employeeLocIds),
          primary_location_id: employeePrimaryLoc || null,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})) as { error?: string }; toast.error(err.error ?? "Failed to save employee"); return; }
      const updated = await res.json() as Employee;
      setEmployees((prev) => prev.map((e) => e.id === updated.id ? updated : e));
      setEmployeeModal(null);
      toast.success("Employee updated");
    } finally {
      setEmployeeSubmitting(false);
    }
  }

  function openOtModal(record: PaymentRecord, emp: Employee) {
    setEditModal({ type: "ot", record, emp });
    setModalMode("units");
    setModalUnits("");
    setModalAmount(record.overtime_pay > 0 ? String(record.overtime_pay) : "");
  }

  function openDeductModal(record: PaymentRecord, emp: Employee) {
    setEditModal({ type: "deduct", record, emp });
    setModalMode("units");
    setModalUnits("");
    setModalAmount(record.deductions > 0 ? String(record.deductions) : "");
  }

  async function handleModalSave() {
    if (!editModal) return;
    setModalSaving(true);
    const { type, record, emp } = editModal;
    try {
      if (modalMode === "amount") {
        const amt = parseFloat(modalAmount) || 0;
        await patchRecord(record.id, type === "ot" ? { overtime_pay: amt } : { deductions: amt });
      } else {
        const units = parseFloat(modalUnits) || 0;
        const dailyRate = (emp.base_salary_monthly ?? 0) / 30;
        const month = `${record.period_year}-${String(record.period_month).padStart(2, "0")}`;

        // Fetch existing OT/leave records for this employee+month to delete them
        const existingRes = await fetch(`/api/attendance?month=${month}&employee_id=${emp.id}`);
        const existing = (await existingRes.json()) as Array<{ id: string; record_type: string }>;

        const targetType = type === "ot" ? "overtime_weekday" : "unpaid_leave";
        const toDelete = existing.filter((r) => r.record_type === targetType);
        await Promise.all(toDelete.map((r) => fetch(`/api/attendance/${r.id}`, { method: "DELETE" })));

        if (units > 0) {
          // For OT: create one record per OT hour block on the last day of the month
          // For simplicity: create a single record with the total hours
          const lastDay = new Date(record.period_year, record.period_month, 0).getDate();
          const recordDate = `${month}-${String(lastDay).padStart(2, "0")}`;
          await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location_id: record.location_id,
              employee_id: emp.id,
              record_date: recordDate,
              record_type: targetType,
              hours: units,
            }),
          });
        }

        const amt = type === "ot" ? units * dailyRate * 1.5 : units * dailyRate;
        await patchRecord(record.id, type === "ot" ? { overtime_pay: Math.round(amt) } : { deductions: Math.round(amt) });
      }
      setEditModal(null);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleConfirmAll() {
    const drafts = rows.filter((r) => r.record?.status === "draft");
    await Promise.all(drafts.map((r) => patchRecord(r.record!.id, { status: "confirmed" as PaymentStatus })));
    toast.success(`${drafts.length} record${drafts.length !== 1 ? "s" : ""} confirmed`);
  }

  async function handlePayAll() {
    const confirmed = rows.filter((r) => r.record?.status === "confirmed");
    await Promise.all(confirmed.map((r) => patchRecord(r.record!.id, { status: "paid" as PaymentStatus })));
    toast.success(`${confirmed.length} record${confirmed.length !== 1 ? "s" : ""} marked paid`);
  }

  function exportPaymentsPdf() {
    const locationName = initialLocations.find((l) => l.id === locationId)?.name ?? "";
    const fmtB = (n: number) => `฿${Math.round(n).toLocaleString()}`;
    const methodLabel = (emp: Employee, record: PaymentRecord | null) => {
      const isBank = record?.payment_method === "bank_transfer" || emp.has_thai_bank_account;
      return isBank ? "Bank" : "Cash";
    };

    const tableRows = rows.filter((r) => r.record).map((r, idx) => {
      const rec = r.record!;
      const total = totalPayment(rec);
      const bg = idx % 2 === 1 ? "background:#f8fafc" : "";
      return `<tr style="${bg}">
        <td style="text-align:left;font-weight:600;padding-left:10px">${r.employee.first_name} ${r.employee.last_name ?? ""}</td>
        <td>${rec.base_salary > 0 ? fmtB(rec.base_salary) : "—"}</td>
        <td style="color:#dc2626">${rec.deductions > 0 ? fmtB(rec.deductions) : "—"}</td>
        <td style="color:#2563eb">${rec.overtime_pay > 0 ? fmtB(rec.overtime_pay) : "—"}</td>
        <td>${rec.service_charge > 0 ? fmtB(rec.service_charge) : "—"}</td>
        <td>${rec.bonus_amount > 0 ? fmtB(rec.bonus_amount) : "—"}</td>
        <td style="font-weight:700">${fmtB(total)}</td>
        <td>${methodLabel(r.employee, rec)}</td>
        <td>${STATUS_LABELS[rec.status]}</td>
      </tr>`;
    }).join("");

    const css = [
      "*{box-sizing:border-box;margin:0;padding:0}",
      "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:11px;color:#1a1a1a;background:#fff}",
      ".accent{height:5px;background:#1e3a8a}",
      ".header{padding:16px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e5e7eb}",
      ".header-left h1{font-size:16px;font-weight:700;color:#111;margin-bottom:3px}",
      ".header-left .meta{font-size:11px;color:#6b7280}",
      ".header-right{text-align:right;font-size:10px;color:#9ca3af}",
      ".content{padding:16px 24px}",
      "table{border-collapse:collapse;width:100%}",
      "th{background:#1e3a8a;color:#fff;font-weight:600;font-size:10px;padding:7px 8px;text-align:right;letter-spacing:0.3px}",
      "th:first-child{text-align:left;padding-left:10px}",
      "td{padding:6px 8px;text-align:right;vertical-align:middle;border-bottom:1px solid #f0f0f0;font-size:10.5px}",
      "@media print{@page{margin:8mm;size:landscape}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
    ].join("");

    const title = `Payments — ${monthName} — ${locationName}`;
    const printHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body><div class="accent"></div><div class="header"><div class="header-left"><h1>${title}</h1><div class="meta">Generated ${new Date().toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })}</div></div><div class="header-right">Capybara Coffee<br>Internal — Confidential</div></div><div class="content"><table><thead><tr><th style="text-align:left;padding-left:10px">Employee</th><th>Base salary</th><th>Deductions</th><th>OT pay</th><th>Svc charge</th><th>Bonus</th><th>Total</th><th>Method</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table></div></body></html>`;

    const blob = new Blob([printHtml], { type: "text/html; charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, "_blank", "width=1150,height=800");
    if (!win) { URL.revokeObjectURL(blobUrl); toast.error("Pop-up blocked — please allow pop-ups"); return; }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  function InlineNumber({ record, field, value, color, emptyLabel }: {
    record: PaymentRecord;
    field: EditableField;
    value: number;
    color?: string;
    emptyLabel?: string;
  }) {
    const isEditing = editingId === record.id && editField === field;
    if (isEditing) {
      return (
        <input
          type="number" min="0" step="100" autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => void patchRecord(record.id, { [field]: parseFloat(editValue) || 0 } as Partial<PaymentRecord>)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void patchRecord(record.id, { [field]: parseFloat(editValue) || 0 } as Partial<PaymentRecord>);
            if (e.key === "Escape") cancelEdit();
          }}
          className="w-24 h-6 text-right text-xs rounded border border-ring bg-background px-1 focus:outline-none"
        />
      );
    }
    return (
      <span
        className="cursor-pointer hover:underline"
        onClick={() => startEdit(record.id, field, value)}
      >
        {value > 0
          ? <span className={color}>{fmtThb(value)}</span>
          : <span className="text-muted-foreground/60 text-[10px]">{emptyLabel ?? "—"}</span>}
      </span>
    );
  }

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.record);
    return {
      base:       paid.reduce((s, r) => s + (r.record?.base_salary ?? 0), 0),
      ot:         paid.reduce((s, r) => s + (r.record?.overtime_pay ?? 0), 0),
      sc:         paid.reduce((s, r) => s + (r.record?.service_charge ?? 0), 0),
      bonus:      paid.reduce((s, r) => s + (r.record?.bonus_amount ?? 0), 0),
      deductions: paid.reduce((s, r) => s + (r.record?.deductions ?? 0), 0),
      total:      paid.reduce((s, r) => s + (r.record ? totalPayment(r.record) : 0), 0),
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
          <Button size="sm" variant="outline" className="gap-1.5"
            onClick={() => void handleConfirmAll()}
            disabled={calculating || !rows.some((r) => r.record?.status === "draft")}>
            <CheckIcon className="size-4" />Confirm all
          </Button>
          <Button size="sm" className="gap-1.5 bg-green-700 hover:bg-green-800"
            onClick={() => void handlePayAll()}
            disabled={calculating || !rows.some((r) => r.record?.status === "confirmed")}>
            <CheckIcon className="size-4" />Pay all
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportPaymentsPdf()}>
            <PrinterIcon className="size-4" />Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin mr-2" />Loading…
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[1080px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40">Employee</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Deductions</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">OT pay</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Svc charge</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Bonus</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Total</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Method</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {employees.length === 0
                      ? <><a href="/dashboard/admin/employees" className="underline hover:text-foreground">Add your first employee</a> to start tracking payments.</>
                      : <>No employees assigned to this location. Assign employees, then use <strong>Calculate period</strong> to generate records.</>}
                  </td>
                </tr>
              ) : rows.map(({ employee: emp, record }, rowIdx) => {
                const isBankTransfer = record?.payment_method === "bank_transfer" || emp.has_thai_bank_account;
                const rowBg = rowIdx % 2 === 1 ? "bg-muted/15" : "";
                const total = record ? totalPayment(record) : 0;

                return (
                  <tr key={emp.id} className={`transition-colors ${rowBg} hover:bg-muted/25`}>
                    {/* Employee name + salary + credit badge */}
                    <td className={`px-4 py-2.5 font-medium sticky left-0 ${rowBg || "bg-background"}`}>
                      <div className="flex flex-col gap-0.5">
                        <span>
                          <button type="button" onClick={() => openEmployeeModal(emp)} className="hover:underline text-left">
                            {emp.first_name} {emp.last_name}
                          </button>
                          {!emp.base_salary_monthly && (
                            <span className="ml-1.5 text-[10px] text-amber-600">no salary set</span>
                          )}
                        </span>
                        {emp.base_salary_monthly ? (
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {fmtThb(emp.base_salary_monthly)}/mo
                          </span>
                        ) : null}
                        {emp.credit_note && (
                          <span className="text-[10px] font-normal text-muted-foreground">{emp.credit_note}</span>
                        )}
                      </div>
                    </td>

                    {/* Deductions — click to open modal */}
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? (
                        <button type="button" onClick={() => openDeductModal(record, emp)}
                          className="hover:underline cursor-pointer">
                          {record.deductions > 0
                            ? <span className="text-destructive">{fmtThb(record.deductions)}</span>
                            : <span className="text-muted-foreground/60 text-[10px]">+ add</span>}
                        </button>
                      ) : <span className="text-muted-foreground/60">—</span>}
                    </td>

                    {/* OT pay — click to open modal */}
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? (
                        <button type="button" onClick={() => openOtModal(record, emp)}
                          className="hover:underline cursor-pointer">
                          {record.overtime_pay > 0
                            ? <span className="text-blue-600 dark:text-blue-400">{fmtThb(record.overtime_pay)}</span>
                            : <span className="text-muted-foreground/60 text-[10px]">+ add</span>}
                        </button>
                      ) : <span className="text-muted-foreground/60">—</span>}
                    </td>

                    {/* Service charge — editable, shows manual indicator */}
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {editingId === record.id && editField === "service_charge" ? (
                            <input
                              type="number" min="0" step="100" autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => void patchRecord(record.id, {
                                service_charge: parseFloat(editValue) || 0,
                              })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void patchRecord(record.id, {
                                  service_charge: parseFloat(editValue) || 0,
                                });
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="w-24 h-6 text-right text-xs rounded border border-ring bg-background px-1 focus:outline-none"
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:underline"
                              onClick={() => startEdit(record.id, "service_charge", record.service_charge)}
                            >
                              {record.service_charge > 0
                                ? fmtThb(record.service_charge)
                                : <span className="text-muted-foreground/60 text-[10px]">+ add</span>}
                            </span>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground/60">—</span>}
                    </td>

                    {/* Bonus — editable */}
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {record ? (
                        <InlineNumber
                          record={record}
                          field="bonus_amount"
                          value={record.bonus_amount}
                          color="text-emerald-700 dark:text-emerald-400"
                          emptyLabel="+ add"
                        />
                      ) : <span className="text-muted-foreground/60">—</span>}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {record ? fmtThb(total) : <span className="text-muted-foreground/60">—</span>}
                    </td>

                    {/* Payment method */}
                    <td className="px-4 py-2.5 text-center">
                      {isBankTransfer
                        ? <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><BuildingIcon className="size-2.5" />Bank</span>
                        : <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><BanknoteIcon className="size-2.5" />Cash</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 text-center">
                      {record ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[record.status]}`}>
                          {STATUS_LABELS[record.status]}
                        </span>
                      ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>

                    {/* Actions */}
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
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums text-destructive">{totals.deductions > 0 ? fmtThb(totals.deductions) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{totals.ot > 0 ? fmtThb(totals.ot) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{totals.sc > 0 ? fmtThb(totals.sc) : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{totals.bonus > 0 ? fmtThb(totals.bonus) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtThb(totals.total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
        <p>Click <strong>Calculate period</strong> to pull OT and deductions from Attendance. Click any OT or deduction amount to edit. Service charge = 1% of location net revenue per employee.</p>
      </div>

      {/* Employee edit modal (item 8) */}
      {employeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEmployeeModal(null); }}>
          <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Edit employee — {employeeModal.first_name} {employeeModal.last_name}</h2>
              <button type="button" onClick={() => setEmployeeModal(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="p-5">
              <EmployeeForm
                form={employeeForm}
                locIds={employeeLocIds}
                primaryLoc={employeePrimaryLoc}
                locations={initialLocations}
                submitting={employeeSubmitting}
                onChange={(key, val) => setEmployeeForm((f) => ({ ...f, [key]: val }))}
                onToggleLoc={(id) => setEmployeeLocIds((s) => { const n = new Set(s); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; })}
                onSetPrimary={(id) => setEmployeePrimaryLoc(id)}
                onSubmit={(e) => void handleEmployeeSave(e)}
                onCancel={() => setEmployeeModal(null)}
                submitLabel="Save changes"
              />
            </div>
          </div>
        </div>
      )}

      {/* OT / Deductions edit modal (item 9) */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditModal(null); }}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-background shadow-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {editModal.type === "ot" ? "Edit OT pay" : "Edit deductions"} — {editModal.emp.first_name} {editModal.emp.last_name}
              </h2>
              <button type="button" onClick={() => setEditModal(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              <button type="button"
                className={`flex-1 py-1.5 font-medium transition-colors ${modalMode === "units" ? "bg-foreground text-background" : "hover:bg-muted/50"}`}
                onClick={() => setModalMode("units")}>
                {editModal.type === "ot" ? "Hours" : "Days"}
              </button>
              <button type="button"
                className={`flex-1 py-1.5 font-medium transition-colors ${modalMode === "amount" ? "bg-foreground text-background" : "hover:bg-muted/50"}`}
                onClick={() => setModalMode("amount")}>
                Amount (฿)
              </button>
            </div>

            {modalMode === "units" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {editModal.type === "ot" ? "OT hours" : "Unpaid leave days"}
                </label>
                <input
                  type="number" min="0" step={editModal.type === "ot" ? "0.5" : "1"} autoFocus
                  value={modalUnits}
                  onChange={(e) => setModalUnits(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="0"
                />
                {modalUnits && (editModal.emp.base_salary_monthly ?? 0) > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {fmtThb(editModal.type === "ot"
                      ? parseFloat(modalUnits) * ((editModal.emp.base_salary_monthly ?? 0) / 30) * 1.5
                      : parseFloat(modalUnits) * ((editModal.emp.base_salary_monthly ?? 0) / 30)
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Amount (฿)</label>
                <input
                  type="number" min="0" step="100" autoFocus
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="0"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setEditModal(null)} disabled={modalSaving}>Cancel</Button>
              <Button type="button" size="sm" className="flex-1" onClick={() => void handleModalSave()} disabled={modalSaving}>
                {modalSaving ? <Loader2Icon className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
