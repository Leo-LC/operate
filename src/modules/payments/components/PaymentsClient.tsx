"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon, ChevronRightIcon, Loader2Icon, CalculatorIcon,
  CheckIcon, BanknoteIcon, BuildingIcon, PrinterIcon, XIcon, EyeIcon, ListIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Pill } from "@/components/ui/pill";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  type PaymentRecord, type PaymentStatus,
  totalPayment, STATUS_LABELS,
} from "@/modules/payments/types";
import type { Employee, AdminLocation } from "@/modules/admin/types";
import { EmployeeForm, EMPTY_EMPLOYEE_FORM, type EmployeeFormState } from "@/modules/admin/components/EmployeeForm";

interface Props {
  initialLocations: AdminLocation[];
}

function fmtThb(n: number) {
  return `฿${Math.round(n).toLocaleString()}`;
}

type View = "table" | "detail";
type StatusFilter = "all" | PaymentStatus;

const STATUS_TONE: Record<PaymentStatus, "warn" | "info" | "good"> = {
  draft:     "warn",
  confirmed: "info",
  paid:      "good",
};

type EditableField =
  | "bonus_amount" | "bonus_note"
  | "deductions" | "deduction_note"
  | "overtime_pay"
  | "service_charge"
  | "notes";

export function PaymentsClient({ initialLocations }: Props) {
  const now = new Date();
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [locationId, setLocationId] = useState(initialLocations[0]?.id ?? "");
  const [view, setView]         = useState<View>("table");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [records, setRecords]   = useState<PaymentRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]   = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editField, setEditField]   = useState<EditableField | null>(null);
  const [editValue, setEditValue]   = useState("");
  const [savingId, setSavingId]     = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Employee modal
  const [employeeModal, setEmployeeModal]     = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm]       = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM);
  const [employeeLocIds, setEmployeeLocIds]   = useState<Set<string>>(new Set());
  const [employeePrimaryLoc, setEmployeePrimaryLoc] = useState("");
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);

  // OT/Deductions edit modal
  type EditModalState = { type: "ot" | "deduct"; record: PaymentRecord; emp: Employee } | null;
  const [editModal, setEditModal]     = useState<EditModalState>(null);
  const [modalMode, setModalMode]     = useState<"units" | "amount">("units");
  const [modalUnits, setModalUnits]   = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });
  const monthDays = new Date(year, month, 0).getDate();
  const dueIn = monthDays - now.getDate();

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

  const stats = useMemo(() => {
    const withRecord = rows.filter((r) => r.record);
    const total   = withRecord.reduce((s, r) => s + totalPayment(r.record!), 0);
    const drafts  = withRecord.filter((r) => r.record?.status === "draft");
    const draftAmt = drafts.reduce((s, r) => s + totalPayment(r.record!), 0);
    const paid    = withRecord.filter((r) => r.record?.status === "paid").reduce((s, r) => s + totalPayment(r.record!), 0);
    return { total, draftCount: drafts.length, draftAmt, paid, headcount: withRecord.length };
  }, [rows]);

  const grouped = useMemo(() => {
    const filter = (s: PaymentStatus) =>
      rows.filter((r) => r.record?.status === s && (statusFilter === "all" || statusFilter === s));
    return {
      draft:     filter("draft"),
      confirmed: filter("confirmed"),
      paid:      filter("paid"),
    };
  }, [rows, statusFilter]);

  const selectedRecord  = records.find((r) => r.id === selectedId) ?? null;
  const selectedEmployee = selectedRecord
    ? employees.find((e) => e.id === selectedRecord.employee_id) ?? null
    : null;

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
    setEditingId(recordId); setEditField(field); setEditValue(String(currentValue));
  }
  function cancelEdit() { setEditingId(null); setEditField(null); }

  function openEmployeeModal(emp: Employee) {
    setEmployeeForm({
      first_name: emp.first_name, last_name: emp.last_name ?? "",
      position: emp.position ?? "", nationality: emp.nationality ?? "",
      national_id: emp.national_id ?? "", work_permit_number: emp.work_permit_number ?? "",
      work_permit_expires_at: emp.work_permit_expires_at ?? "", email: emp.email ?? "",
      phone: emp.phone ?? "", notes: emp.notes ?? "",
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
      setEmployees((prev) => prev.map((emp) => emp.id === updated.id ? updated : emp));
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
        const monthStr = `${record.period_year}-${String(record.period_month).padStart(2, "0")}`;
        const existingRes = await fetch(`/api/attendance?month=${monthStr}&employee_id=${emp.id}`);
        const existing = (await existingRes.json()) as Array<{ id: string; record_type: string }>;
        const targetType = type === "ot" ? "overtime_weekday" : "unpaid_leave";
        const toDelete = existing.filter((r) => r.record_type === targetType);
        await Promise.all(toDelete.map((r) => fetch(`/api/attendance/${r.id}`, { method: "DELETE" })));
        if (units > 0) {
          const lastDay = new Date(record.period_year, record.period_month, 0).getDate();
          const recordDate = `${monthStr}-${String(lastDay).padStart(2, "0")}`;
          await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_id: record.location_id, employee_id: emp.id, record_date: recordDate, record_type: targetType, hours: units }),
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


  function exportPaymentsPdf() {
    const locationName = initialLocations.find((l) => l.id === locationId)?.name ?? "";
    const fmtB = (n: number) => `฿${Math.round(n).toLocaleString()}`;
    const methodLabel = (emp: Employee, record: PaymentRecord | null) =>
      (record?.payment_method === "bank_transfer" || emp.has_thai_bank_account) ? "Bank" : "Cash";

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

  const COL_GRID = "28px 1.5fr 1fr 100px 100px 100px 100px 120px 100px 80px";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        eyebrow={monthName}
        title="Payments"
        subtitle="Wages, tips and deductions for the period."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            {/* Location selector */}
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              style={{
                height: 34, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                background: "var(--surface)", color: "var(--fg)",
                padding: "0 var(--s-3)", fontSize: 13, fontFamily: "var(--font-sans)", outline: "none",
              }}
            >
              {initialLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            {/* Month nav */}
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

            {/* View toggle */}
            <div
              style={{
                display: "inline-flex", borderRadius: "var(--r-md)", border: "1px solid var(--line)",
                background: "var(--bg-2)", padding: 3, gap: 2,
              }}
            >
              {([
                { id: "table" as View, label: "Table",  Icon: ListIcon },
                { id: "detail" as View, label: "Detail", Icon: EyeIcon },
              ]).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    height: 26, padding: "0 10px",
                    borderRadius: "var(--r-sm)", fontSize: 12,
                    fontWeight: view === id ? 500 : 400,
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

            <Button
              size="sm" variant="secondary" style={{ gap: 6 }}
              onClick={() => void handleCalculate()} disabled={calculating || !locationId}
            >
              {calculating ? <Loader2Icon size={13} className="animate-spin" /> : <CalculatorIcon size={13} />}
              Calculate
            </Button>

            <Button
              size="sm"
              style={{ gap: 6 }}
              onClick={() => void handleConfirmAll()}
              disabled={calculating || stats.draftCount === 0}
            >
              <CheckIcon size={13} />
              Confirm {stats.draftCount > 0 ? stats.draftCount : ""} drafts
            </Button>

            <Button size="sm" variant="secondary" style={{ gap: 6 }} onClick={() => exportPaymentsPdf()}>
              <PrinterIcon size={13} />
              PDF
            </Button>
          </div>
        }
      />

      {/* Stats band */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--s-3)" }}>
        {[
          {
            label: "Total payroll",
            value: stats.total > 0 ? fmtThb(stats.total) : "—",
            hint: `${stats.headcount} ${stats.headcount === 1 ? "person" : "people"}`,
          },
          {
            label: "Drafts",
            value: String(stats.draftCount),
            delta: stats.draftAmt > 0 ? fmtThb(stats.draftAmt) : undefined,
            deltaDir: "neutral" as const,
            hint: "Awaiting confirmation",
          },
          {
            label: "Paid so far",
            value: stats.paid > 0 ? fmtThb(stats.paid) : "—",
            hint: monthName,
          },
          {
            label: "Due in",
            value: dueIn > 0 ? String(dueIn) : "today",
            hint: `${new Date(year, month - 1, monthDays).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}`,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)", padding: "var(--s-4)",
            }}
          >
            <Stat {...s} />
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 16px", gap: 8, fontSize: 13, color: "var(--fg-4)" }}>
          <Loader2Icon size={16} className="animate-spin" />
          Loading…
        </div>
      ) : view === "table" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
          {/* Status filter */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                display: "inline-flex", borderRadius: "var(--r-md)", border: "1px solid var(--line)",
                background: "var(--bg-2)", padding: 3, gap: 2,
              }}
            >
              {(["all", "draft", "confirmed", "paid"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  style={{
                    height: 24, padding: "0 10px",
                    borderRadius: "var(--r-sm)", fontSize: 12,
                    fontWeight: statusFilter === f ? 500 : 400,
                    color: statusFilter === f ? "var(--fg)" : "var(--fg-4)",
                    background: statusFilter === f ? "var(--surface)" : "transparent",
                    border: `1px solid ${statusFilter === f ? "var(--line)" : "transparent"}`,
                    cursor: "pointer", transition: "all var(--dur) var(--ease)",
                    textTransform: "capitalize",
                  }}
                >
                  {f === "all" ? "All" : STATUS_LABELS[f as PaymentStatus]}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "var(--fg-4)" }}>
              Due {new Date(year, month - 1, monthDays).toLocaleDateString("en", { day: "numeric", month: "short" })}
            </span>
          </div>

          {/* Table */}
          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
            {/* Column headers */}
            <div
              style={{
                display: "grid", gridTemplateColumns: COL_GRID,
                padding: "10px var(--s-4)", background: "var(--bg-2)",
                borderBottom: "1px solid var(--line)", gap: 12, alignItems: "center",
              }}
            >
              {["", "Employee", "Shop · Role", "Base", "Deduct.", "OT pay", "Svc chg", "Bonus", "Total", ""].map((h, i) => (
                <div
                  key={i}
                  className="eyebrow"
                  style={{
                    color: "var(--fg-4)",
                    textAlign: i > 2 && i < 9 ? "right" : "left",
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Status groups */}
            {(["draft", "confirmed", "paid"] as PaymentStatus[])
              .filter((g) => grouped[g].length > 0)
              .map((group) => (
                <div key={group}>
                  {/* Group header */}
                  <div
                    style={{
                      padding: "8px var(--s-4)",
                      background: "var(--surface-2)",
                      borderBottom: "1px solid var(--line)",
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 12, color: "var(--fg-3)", fontWeight: 500,
                    }}
                  >
                    <Pill tone={STATUS_TONE[group]} size="sm" dot>
                      {STATUS_LABELS[group].toUpperCase()}
                    </Pill>
                    <span>
                      {grouped[group].length} · {fmtThb(grouped[group].reduce((s, r) => s + (r.record ? totalPayment(r.record) : 0), 0))}
                    </span>
                  </div>

                  {/* Rows */}
                  {grouped[group].map(({ employee: emp, record }) => {
                    const isBankTransfer = record?.payment_method === "bank_transfer" || emp.has_thai_bank_account;
                    const total = record ? totalPayment(record) : 0;
                    const fullName = `${emp.first_name} ${emp.last_name ?? ""}`.trim();
                    const locationName = initialLocations.find((l) =>
                      emp.employee_locations?.some((el) => el.location_id === l.id && el.is_primary) ||
                      emp.location_id === l.id
                    )?.name ?? "";

                    return (
                      <div
                        key={emp.id}
                        style={{
                          display: "grid", gridTemplateColumns: COL_GRID,
                          padding: "12px var(--s-4)", alignItems: "center", gap: 12,
                          borderBottom: "1px solid var(--line)",
                          fontSize: 13, transition: "background var(--dur) var(--ease)",
                        }}
                        className="group/row hover:bg-[var(--row-hover)]"
                      >
                        {/* Checkbox placeholder */}
                        <div />

                        {/* Employee */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <UserAvatar name={fullName} size={28} />
                          <div>
                            <button
                              type="button"
                              onClick={() => openEmployeeModal(emp)}
                              style={{
                                fontSize: 13, fontWeight: 500, color: "var(--fg)",
                                background: "none", border: "none", cursor: "pointer", textAlign: "left",
                                padding: 0,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                            >
                              {fullName}
                            </button>
                            {!emp.base_salary_monthly && (
                              <div style={{ fontSize: 11, color: "var(--warn)" }}>no salary set</div>
                            )}
                            {emp.base_salary_monthly ? (
                              <div className="mono tabular-nums" style={{ fontSize: 11, color: "var(--fg-4)" }}>
                                {fmtThb(emp.base_salary_monthly)}/mo
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Shop · Role */}
                        <div>
                          <div style={{ color: "var(--fg)" }}>{locationName}</div>
                          <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{emp.position ?? "—"}</div>
                        </div>

                        {/* Base */}
                        <div className="mono tabular-nums" style={{ textAlign: "right" }}>
                          {record?.base_salary ? fmtThb(record.base_salary) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                        </div>

                        {/* Deductions */}
                        <div className="mono tabular-nums" style={{ textAlign: "right" }}>
                          {record ? (
                            <button
                              type="button"
                              onClick={() => openDeductModal(record, emp)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit" }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                            >
                              {record.deductions > 0
                                ? <span style={{ color: "var(--bad)" }}>−{fmtThb(record.deductions)}</span>
                                : <span style={{ fontSize: 11, color: "var(--fg-4)" }}>+ add</span>}
                            </button>
                          ) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                        </div>

                        {/* OT */}
                        <div className="mono tabular-nums" style={{ textAlign: "right" }}>
                          {record ? (
                            <button
                              type="button"
                              onClick={() => openOtModal(record, emp)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit" }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                            >
                              {record.overtime_pay > 0
                                ? <span style={{ color: "var(--info)" }}>+{fmtThb(record.overtime_pay)}</span>
                                : <span style={{ fontSize: 11, color: "var(--fg-4)" }}>+ add</span>}
                            </button>
                          ) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                        </div>

                        {/* Service charge */}
                        <div className="mono tabular-nums" style={{ textAlign: "right" }}>
                          {record ? (
                            editingId === record.id && editField === "service_charge" ? (
                              <input
                                type="number" min="0" step="100" autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => void patchRecord(record.id, { service_charge: parseFloat(editValue) || 0 })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void patchRecord(record.id, { service_charge: parseFloat(editValue) || 0 });
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                style={{
                                  width: 80, height: 24, textAlign: "right", fontSize: 12,
                                  borderRadius: "var(--r-sm)", border: "1px solid var(--focus-ring)",
                                  background: "var(--surface)", padding: "0 4px", outline: "none",
                                }}
                              />
                            ) : (
                              <span
                                style={{ cursor: "pointer" }}
                                onClick={() => startEdit(record.id, "service_charge", record.service_charge)}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                              >
                                {record.service_charge > 0
                                  ? fmtThb(record.service_charge)
                                  : <span style={{ fontSize: 11, color: "var(--fg-4)" }}>+ add</span>}
                              </span>
                            )
                          ) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                        </div>

                        {/* Bonus */}
                        <div className="mono tabular-nums" style={{ textAlign: "right" }}>
                          {record ? (
                            editingId === record.id && editField === "bonus_amount" ? (
                              <input
                                type="number" min="0" step="100" autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => void patchRecord(record.id, { bonus_amount: parseFloat(editValue) || 0 })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void patchRecord(record.id, { bonus_amount: parseFloat(editValue) || 0 });
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                style={{
                                  width: 80, height: 24, textAlign: "right", fontSize: 12,
                                  borderRadius: "var(--r-sm)", border: "1px solid var(--focus-ring)",
                                  background: "var(--surface)", padding: "0 4px", outline: "none",
                                }}
                              />
                            ) : (
                              <span
                                style={{ cursor: "pointer" }}
                                onClick={() => startEdit(record.id, "bonus_amount", record.bonus_amount)}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                              >
                                {record.bonus_amount > 0
                                  ? <span style={{ color: "var(--good)" }}>+{fmtThb(record.bonus_amount)}</span>
                                  : <span style={{ fontSize: 11, color: "var(--fg-4)" }}>+ add</span>}
                              </span>
                            )
                          ) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                        </div>

                        {/* Total */}
                        <div className="mono tabular-nums" style={{ textAlign: "right", fontWeight: 600, fontSize: 14 }}>
                          {record ? fmtThb(total) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                          {record && record.status !== "paid" && (
                            savingId === record.id ? (
                              <Loader2Icon size={14} className="animate-spin" style={{ color: "var(--fg-4)" }} />
                            ) : record.status === "draft" ? (
                              <Button
                                size="sm" variant="secondary"
                                style={{ height: 26, fontSize: 11, gap: 4, color: "var(--info)" }}
                                onClick={() => void setStatus(record, "confirmed")}
                              >
                                <CheckIcon size={12} />Confirm
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                style={{ height: 26, fontSize: 11, gap: 4 }}
                                onClick={() => void setStatus(record, "paid")}
                              >
                                <CheckIcon size={12} />Pay
                              </Button>
                            )
                          )}
                          {record?.status === "paid" && record.paid_at && (
                            <span className="mono tabular-nums" style={{ fontSize: 11, color: "var(--fg-4)" }}>
                              {new Date(record.paid_at).toLocaleDateString("en", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {/* Method badge */}
                          <Pill tone={isBankTransfer ? "info" : "warn"} size="sm">
                            {isBankTransfer
                              ? <><BuildingIcon style={{ width: 10, height: 10 }} /> Bank</>
                              : <><BanknoteIcon style={{ width: 10, height: 10 }} /> Cash</>}
                          </Pill>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {/* Empty state */}
            {rows.length === 0 && (
              <div style={{ padding: "48px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--fg-4)" }}>
                  {employees.length === 0
                    ? "Add employees in Admin to start tracking payments."
                    : "No employees assigned to this location. Use Calculate period to generate records."}
                </p>
              </div>
            )}

            {/* Totals row */}
            {rows.some((r) => r.record) && (
              <div
                style={{
                  display: "grid", gridTemplateColumns: COL_GRID,
                  padding: "12px var(--s-4)", alignItems: "center", gap: 12,
                  borderTop: "2px solid var(--line)", background: "var(--bronze-soft)",
                  fontWeight: 600, fontSize: 13,
                }}
              >
                <div />
                <div style={{ color: "var(--bronze)", fontWeight: 600 }}>Total</div>
                <div />
                <div className="mono tabular-nums" style={{ textAlign: "right", color: "var(--fg)" }}>
                  {totals.base > 0 ? fmtThb(totals.base) : "—"}
                </div>
                <div className="mono tabular-nums" style={{ textAlign: "right", color: totals.deductions > 0 ? "var(--bad)" : "var(--fg-4)" }}>
                  {totals.deductions > 0 ? `−${fmtThb(totals.deductions)}` : "—"}
                </div>
                <div className="mono tabular-nums" style={{ textAlign: "right", color: "var(--fg)" }}>
                  {totals.ot > 0 ? `+${fmtThb(totals.ot)}` : "—"}
                </div>
                <div className="mono tabular-nums" style={{ textAlign: "right", color: "var(--fg)" }}>
                  {totals.sc > 0 ? fmtThb(totals.sc) : "—"}
                </div>
                <div className="mono tabular-nums" style={{ textAlign: "right", color: "var(--fg)" }}>
                  {totals.bonus > 0 ? `+${fmtThb(totals.bonus)}` : "—"}
                </div>
                <div className="mono tabular-nums" style={{ textAlign: "right", fontSize: 15, color: "var(--bronze)" }}>
                  {fmtThb(totals.total)}
                </div>
                <div />
              </div>
            )}
          </div>

          <p style={{ fontSize: 11, color: "var(--fg-4)" }}>
            Click <strong>Calculate</strong> to pull OT and deductions from Attendance. Click any amount to edit inline.
          </p>
        </div>
      ) : (
        /* Detail view — two-pane */
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "var(--s-4)", minHeight: 480 }}>
          {/* Left: employee list */}
          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
            <div style={{ padding: "10px var(--s-4)", background: "var(--bg-2)", borderBottom: "1px solid var(--line)", fontSize: 11, color: "var(--fg-4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Employees · {rows.filter(r => r.record).length}
            </div>
            {rows.filter(r => r.record).map(({ employee: emp, record }) => {
              const total = record ? totalPayment(record) : 0;
              const fullName = `${emp.first_name} ${emp.last_name ?? ""}`.trim();
              const isSelected = selectedId === record?.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setSelectedId(record?.id ?? null)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "12px var(--s-4)", borderBottom: "1px solid var(--line)",
                    background: isSelected ? "var(--bronze-soft)" : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background var(--dur) var(--ease)",
                  }}
                >
                  <UserAvatar name={fullName} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>{fullName}</div>
                    <div className="mono tabular-nums" style={{ fontSize: 12, color: "var(--fg-4)" }}>
                      {fmtThb(total)}
                    </div>
                  </div>
                  {record && <Pill tone={STATUS_TONE[record.status]} size="sm">{STATUS_LABELS[record.status]}</Pill>}
                </button>
              );
            })}
            {rows.filter(r => r.record).length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "var(--fg-4)" }}>
                No records yet. Run Calculate.
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          {selectedRecord && selectedEmployee ? (
            <div
              style={{
                border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
                background: "var(--surface)", display: "flex", flexDirection: "column",
              }}
            >
              {/* Header */}
              <div style={{ padding: "var(--s-5)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: "var(--s-4)" }}>
                <UserAvatar name={`${selectedEmployee.first_name} ${selectedEmployee.last_name ?? ""}`.trim()} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "var(--fg)" }}>
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-4)" }}>{selectedEmployee.position ?? "—"}</div>
                </div>
                <Pill tone={STATUS_TONE[selectedRecord.status]} size="md" dot>
                  {STATUS_LABELS[selectedRecord.status]}
                </Pill>
              </div>

              {/* Breakdown */}
              <div style={{ padding: "var(--s-5)", flex: 1 }}>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)" }}>Pay breakdown</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
                  {[
                    { label: "Base salary",    value: selectedRecord.base_salary,    color: "var(--fg)" },
                    { label: "Service charge", value: selectedRecord.service_charge, color: "var(--fg)" },
                    { label: "Overtime pay",   value: selectedRecord.overtime_pay,   color: "var(--info)", prefix: "+" },
                    { label: "Bonus",          value: selectedRecord.bonus_amount,   color: "var(--good)", prefix: "+" },
                    { label: "Deductions",     value: selectedRecord.deductions,     color: "var(--bad)",  prefix: "−" },
                  ].map(({ label, value, color, prefix }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{label}</span>
                      <span className="mono tabular-nums" style={{ fontSize: 13, fontWeight: value > 0 ? 500 : 400, color: value > 0 ? color : "var(--fg-4)" }}>
                        {value > 0 ? `${prefix ?? ""}${fmtThb(value)}` : "—"}
                      </span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--s-2)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--s-1)" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Total</span>
                    <span className="mono tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>
                      {fmtThb(totalPayment(selectedRecord))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              {selectedRecord.status !== "paid" && (
                <div style={{ padding: "var(--s-4) var(--s-5)", borderTop: "1px solid var(--line)", display: "flex", gap: "var(--s-2)" }}>
                  {selectedRecord.status === "draft" && (
                    <Button
                      size="sm" variant="secondary"
                      style={{ gap: 6 }}
                      onClick={() => void setStatus(selectedRecord, "confirmed")}
                      disabled={savingId === selectedRecord.id}
                    >
                      <CheckIcon size={13} />Confirm
                    </Button>
                  )}
                  {selectedRecord.status === "confirmed" && (
                    <Button
                      size="sm"
                      style={{ gap: 6 }}
                      onClick={() => void setStatus(selectedRecord, "paid")}
                      disabled={savingId === selectedRecord.id}
                    >
                      <CheckIcon size={13} />Mark paid
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" style={{ gap: 6 }} onClick={() => exportPaymentsPdf()}>
                    <PrinterIcon size={13} />Slip PDF
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--fg-4)", fontSize: 13,
              }}
            >
              Select an employee to view details
            </div>
          )}
        </div>
      )}

      {/* Employee edit modal */}
      {employeeModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
            padding: "var(--s-4)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEmployeeModal(null); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 680,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", boxShadow: "var(--shadow-2)",
              overflowY: "auto", maxHeight: "90vh",
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)",
              }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
                Edit employee — {employeeModal.first_name} {employeeModal.last_name}
              </h2>
              <button
                type="button"
                onClick={() => setEmployeeModal(null)}
                style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
              >
                <XIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ padding: "var(--s-5)" }}>
              <EmployeeForm
                form={employeeForm}
                locIds={employeeLocIds}
                primaryLoc={employeePrimaryLoc}
                locations={initialLocations}
                submitting={employeeSubmitting}
                onChange={(key, val) => setEmployeeForm((f) => ({ ...f, [key]: val }))}
                onToggleLoc={(id) => setEmployeeLocIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                onSetPrimary={(id) => setEmployeePrimaryLoc(id)}
                onSubmit={(e) => void handleEmployeeSave(e)}
                onCancel={() => setEmployeeModal(null)}
                submitLabel="Save changes"
              />
            </div>
          </div>
        </div>
      )}

      {/* OT / Deductions modal */}
      {editModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
            padding: "var(--s-4)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditModal(null); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 340,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", boxShadow: "var(--shadow-2)",
              padding: "var(--s-5)", display: "flex", flexDirection: "column", gap: "var(--s-4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
                {editModal.type === "ot" ? "Edit OT pay" : "Edit deductions"} — {editModal.emp.first_name}
              </h2>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
              >
                <XIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Mode toggle */}
            <div style={{ display: "flex", borderRadius: "var(--r-md)", border: "1px solid var(--line)", overflow: "hidden" }}>
              {(["units", "amount"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalMode(m)}
                  style={{
                    flex: 1, padding: "6px 8px", fontSize: 12,
                    fontWeight: modalMode === m ? 500 : 400,
                    color: modalMode === m ? "var(--fg)" : "var(--fg-4)",
                    background: modalMode === m ? "var(--surface-2)" : "transparent",
                    borderLeft: m === "amount" ? "1px solid var(--line)" : "none",
                    border: m === "units" ? "none" : undefined,
                    cursor: "pointer", transition: "all var(--dur) var(--ease)",
                  }}
                >
                  {m === "units" ? (editModal.type === "ot" ? "Hours" : "Days") : "Amount (฿)"}
                </button>
              ))}
            </div>

            {modalMode === "units" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>
                  {editModal.type === "ot" ? "OT hours" : "Unpaid leave days"}
                </label>
                <input
                  type="number" min="0" step={editModal.type === "ot" ? "0.5" : "1"} autoFocus
                  value={modalUnits}
                  onChange={(e) => setModalUnits(e.target.value)}
                  placeholder="0"
                  style={{
                    height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                    background: "var(--bg-2)", padding: "0 var(--s-3)",
                    fontSize: 14, color: "var(--fg)", outline: "none", width: "100%",
                  }}
                />
                {modalUnits && (editModal.emp.base_salary_monthly ?? 0) > 0 && (
                  <p className="mono tabular-nums" style={{ fontSize: 11, color: "var(--fg-4)" }}>
                    ≈ {fmtThb(editModal.type === "ot"
                      ? parseFloat(modalUnits) * ((editModal.emp.base_salary_monthly ?? 0) / 30) * 1.5
                      : parseFloat(modalUnits) * ((editModal.emp.base_salary_monthly ?? 0) / 30)
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Amount (฿)</label>
                <input
                  type="number" min="0" step="100" autoFocus
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  placeholder="0"
                  style={{
                    height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                    background: "var(--bg-2)", padding: "0 var(--s-3)",
                    fontSize: 14, color: "var(--fg)", outline: "none", width: "100%",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "var(--s-2)" }}>
              <Button type="button" variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => setEditModal(null)} disabled={modalSaving}>
                Cancel
              </Button>
              <Button type="button" size="sm" style={{ flex: 1 }} onClick={() => void handleModalSave()} disabled={modalSaving}>
                {modalSaving ? <Loader2Icon size={14} className="animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
