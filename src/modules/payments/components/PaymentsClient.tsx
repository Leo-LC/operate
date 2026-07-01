"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon, ChevronRightIcon, Loader2Icon, CalculatorIcon,
  PrinterIcon, XIcon, EyeIcon, ListIcon, PlusIcon, Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  type PaymentRecord,
  adjustmentsTotal,
  totalPayment,
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

export function PaymentsClient({ initialLocations }: Props) {
  const now = new Date();
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [locationId, setLocationId] = useState(initialLocations[0]?.id ?? "");
  const [view, setView]         = useState<View>("table");

  const [records, setRecords]   = useState<PaymentRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]   = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Employee modal
  const [employeeModal, setEmployeeModal]     = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm]       = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM);
  const [employeeLocIds, setEmployeeLocIds]   = useState<Set<string>>(new Set());
  const [employeePrimaryLoc, setEmployeePrimaryLoc] = useState("");
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);

  // Base salary override modal
  type BaseSalaryModalState = { record: PaymentRecord; emp: Employee } | null;
  const [baseSalaryModal, setBaseSalaryModal] = useState<BaseSalaryModalState>(null);
  const [baseSalaryValue, setBaseSalaryValue] = useState("");
  const [baseSalaryReason, setBaseSalaryReason] = useState("");
  const [baseSalarySaving, setBaseSalarySaving] = useState(false);

  // Adjustments modal (view/add/remove)
  type AdjustmentsModalState = { record: PaymentRecord; emp: Employee } | null;
  const [adjustmentsModal, setAdjustmentsModal] = useState<AdjustmentsModalState>(null);
  const [newAdjAmount, setNewAdjAmount] = useState("");
  const [newAdjReason, setNewAdjReason] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjDeletingId, setAdjDeletingId] = useState<string | null>(null);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });
  const monthDays = new Date(year, month, 0).getDate();

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
    const total = withRecord.reduce((s, r) => s + totalPayment(r.record!), 0);
    return { total, headcount: withRecord.length };
  }, [rows]);

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
        toast.error(err.error ?? "Generation failed");
        return;
      }
      const saved = await res.json() as PaymentRecord[];
      setRecords(saved);
      toast.success("Period generated");
    } finally {
      setCalculating(false);
    }
  }

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
      service_charge_pct: emp.service_charge_pct != null ? String(emp.service_charge_pct) : "",
    });
    const locs = emp.employee_locations ?? [];
    setEmployeeLocIds(new Set(locs.map((el) => el.location_id)));
    const primaryLoc = locs.find((el) => el.is_primary);
    setEmployeePrimaryLoc(primaryLoc?.location_id ?? emp.location_id ?? "");
    setEmployeeModal(emp);
  }

  const handleEmployeeSave = useCallback(async () => {
    if (!employeeModal) return;
    setEmployeeSubmitting(true);
    try {
      const res = await fetch(`/api/admin/employees/${employeeModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...employeeForm,
          base_salary_monthly: employeeForm.base_salary_monthly ? parseFloat(employeeForm.base_salary_monthly) : null,
          service_charge_pct: employeeForm.service_charge_pct ? parseFloat(employeeForm.service_charge_pct) : null,
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
  }, [employeeModal, employeeForm, employeeLocIds, employeePrimaryLoc]);

  const handleEmployeeSaveRef = useRef(handleEmployeeSave);
  useEffect(() => { handleEmployeeSaveRef.current = handleEmployeeSave; });

  useEffect(() => {
    if (!employeeModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setEmployeeModal(null); }
      if (e.key === "Enter" && !e.shiftKey && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        void handleEmployeeSaveRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [employeeModal]);

  function openBaseSalaryModal(record: PaymentRecord, emp: Employee) {
    setBaseSalaryModal({ record, emp });
    setBaseSalaryValue(String(record.base_salary));
    setBaseSalaryReason("");
  }

  async function handleBaseSalarySave() {
    if (!baseSalaryModal) return;
    const value = parseFloat(baseSalaryValue);
    if (!Number.isFinite(value)) { toast.error("Enter a valid amount"); return; }
    if (!baseSalaryReason.trim()) { toast.error("A reason is required"); return; }
    setBaseSalarySaving(true);
    try {
      const res = await fetch(`/api/payments/${baseSalaryModal.record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_salary: value, reason: baseSalaryReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to save"); return;
      }
      const updated = await res.json() as PaymentRecord;
      setRecords((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      setBaseSalaryModal(null);
      toast.success("Base salary updated");
    } finally {
      setBaseSalarySaving(false);
    }
  }

  function openAdjustmentsModal(record: PaymentRecord, emp: Employee) {
    setAdjustmentsModal({ record, emp });
    setNewAdjAmount("");
    setNewAdjReason("");
  }

  async function handleAddAdjustment() {
    if (!adjustmentsModal) return;
    const amount = parseFloat(newAdjAmount);
    if (!Number.isFinite(amount) || amount === 0) { toast.error("Enter a non-zero amount"); return; }
    if (!newAdjReason.trim()) { toast.error("A reason is required"); return; }
    setAdjSaving(true);
    try {
      const res = await fetch(`/api/payments/${adjustmentsModal.record.id}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: newAdjReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to add adjustment"); return;
      }
      const updated = await res.json() as PaymentRecord;
      setRecords((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      setAdjustmentsModal({ record: updated, emp: adjustmentsModal.emp });
      setNewAdjAmount("");
      setNewAdjReason("");
      toast.success("Adjustment added");
    } finally {
      setAdjSaving(false);
    }
  }

  async function handleDeleteAdjustment(adjustmentId: string) {
    if (!adjustmentsModal) return;
    setAdjDeletingId(adjustmentId);
    try {
      const res = await fetch(`/api/payments/adjustments/${adjustmentId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to remove adjustment"); return;
      }
      const updatedAdjustments = adjustmentsModal.record.adjustments.filter((a) => a.id !== adjustmentId);
      const updatedRecord = { ...adjustmentsModal.record, adjustments: updatedAdjustments };
      setRecords((prev) => prev.map((r) => r.id === updatedRecord.id ? updatedRecord : r));
      setAdjustmentsModal({ record: updatedRecord, emp: adjustmentsModal.emp });
    } finally {
      setAdjDeletingId(null);
    }
  }

  useEffect(() => {
    if (!baseSalaryModal && !adjustmentsModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setBaseSalaryModal(null); setAdjustmentsModal(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [baseSalaryModal, adjustmentsModal]);

  function exportPaymentsPdf(single?: { employee: Employee; record: PaymentRecord }) {
    const locationName = initialLocations.find((l) => l.id === locationId)?.name ?? "";
    const fmtB = (n: number) => `฿${Math.round(n).toLocaleString()}`;
    const methodLabel = (emp: Employee, record: PaymentRecord | null) =>
      (record?.payment_method === "bank_transfer" || emp.has_thai_bank_account) ? "Bank" : "Cash";

    const sourceRows = single
      ? [{ employee: single.employee, record: single.record }]
      : rows.filter((r) => r.record);

    const tableRows = sourceRows.map((r, idx) => {
      const rec = r.record!;
      const adj = adjustmentsTotal(rec);
      const total = totalPayment(rec);
      const bg = idx % 2 === 1 ? "background:#f8fafc" : "";
      return `<tr style="${bg}">
        <td style="text-align:left;font-weight:600;padding-left:10px">${r.employee.first_name} ${r.employee.last_name ?? ""}</td>
        <td>${rec.base_salary > 0 ? fmtB(rec.base_salary) : "—"}</td>
        <td>${rec.service_charge > 0 ? fmtB(rec.service_charge) : "—"}</td>
        <td style="color:${adj < 0 ? "#dc2626" : "#2563eb"}">${adj !== 0 ? (adj > 0 ? "+" : "−") + fmtB(Math.abs(adj)) : "—"}</td>
        <td style="font-weight:700">${fmtB(total)}</td>
        <td>${methodLabel(r.employee, rec)}</td>
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

    const employeeLabel = single
      ? `${single.employee.first_name} ${single.employee.last_name ?? ""}`.trim()
      : locationName;
    const title = `Payments — ${monthName} — ${employeeLabel}`;
    const printHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body><div class="accent"></div><div class="header"><div class="header-left"><h1>${title}</h1><div class="meta">Generated ${new Date().toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })}</div></div><div class="header-right">Capybara Coffee<br>Internal — Confidential</div></div><div class="content"><table><thead><tr><th style="text-align:left;padding-left:10px">Employee</th><th>Base salary</th><th>Svc charge</th><th>Adjustments</th><th>Total</th><th>Method</th></tr></thead><tbody>${tableRows}</tbody></table></div></body></html>`;

    const blob = new Blob([printHtml], { type: "text/html; charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, "_blank", "width=1150,height=800");
    if (!win) { URL.revokeObjectURL(blobUrl); toast.error("Pop-up blocked — please allow pop-ups"); return; }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  const totals = useMemo(() => {
    const paid = rows.filter((r) => r.record);
    return {
      base:  paid.reduce((s, r) => s + (r.record?.base_salary ?? 0), 0),
      sc:    paid.reduce((s, r) => s + (r.record?.service_charge ?? 0), 0),
      adj:   paid.reduce((s, r) => s + (r.record ? adjustmentsTotal(r.record) : 0), 0),
      total: paid.reduce((s, r) => s + (r.record ? totalPayment(r.record) : 0), 0),
    };
  }, [rows]);

  const COL_GRID = "28px 1.5fr 110px 110px 130px 130px 90px 90px";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        eyebrow={monthName}
        title="Payments"
        subtitle="Base salary, service charge and manual adjustments for the period."
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
              Generate period
            </Button>

            <Button size="sm" variant="secondary" style={{ gap: 6 }} onClick={() => exportPaymentsPdf()}>
              <PrinterIcon size={13} />
              PDF
            </Button>
          </div>
        }
      />

      {/* Stats band */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--s-3)" }}>
        {[
          {
            label: "Total payroll",
            value: stats.total > 0 ? fmtThb(stats.total) : "—",
            hint: monthName,
          },
          {
            label: "Employees",
            value: String(stats.headcount),
            hint: `${stats.headcount === 1 ? "person" : "people"} with records`,
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
          {/* Due date hint */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
              {["", "Employee", "Base", "Svc chg", "Adjustments", "Total"].map((h, i) => (
                <div
                  key={i}
                  className="eyebrow"
                  style={{
                    color: "var(--fg-4)",
                    textAlign: i > 1 ? "right" : "left",
                  }}
                >
                  {h}
                </div>
              ))}
              <div className="eyebrow" style={{ color: "var(--fg-4)", textAlign: "right" }}>Cash</div>
              <div className="eyebrow" style={{ color: "var(--fg-4)", textAlign: "right" }}>Transfer</div>
            </div>

            {/* Flat employee rows */}
            {rows.map(({ employee: emp, record }) => {
              const isBankTransfer = record?.payment_method === "bank_transfer" || emp.has_thai_bank_account;
              const total = record ? totalPayment(record) : 0;
              const adj = record ? adjustmentsTotal(record) : 0;
              const adjCount = record?.adjustments?.length ?? 0;
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
                      {locationName && (
                        <div style={{ fontSize: 11, color: "var(--fg-4)" }}>{locationName}</div>
                      )}
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

                  {/* Base salary — click to override with a reason */}
                  <div className="mono tabular-nums" style={{ textAlign: "right" }}>
                    {record ? (
                      <button
                        type="button"
                        onClick={() => openBaseSalaryModal(record, emp)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit" }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                      >
                        {record.base_salary > 0 ? fmtThb(record.base_salary) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                      </button>
                    ) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </div>

                  {/* Service charge — automatic, read-only */}
                  <div className="mono tabular-nums" style={{ textAlign: "right" }}>
                    {record
                      ? (record.service_charge > 0 ? fmtThb(record.service_charge) : <span style={{ color: "var(--fg-4)" }}>—</span>)
                      : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </div>

                  {/* Adjustments — click to view/add/remove, each with a reason */}
                  <div className="mono tabular-nums" style={{ textAlign: "right" }}>
                    {record ? (
                      <button
                        type="button"
                        onClick={() => openAdjustmentsModal(record, emp)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit", fontFamily: "inherit" }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                      >
                        {adjCount > 0
                          ? <span style={{ color: adj >= 0 ? "var(--good)" : "var(--bad)" }}>{adj >= 0 ? "+" : "−"}{fmtThb(Math.abs(adj))} ({adjCount})</span>
                          : <span style={{ fontSize: 11, color: "var(--fg-4)" }}>+ add</span>}
                      </button>
                    ) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </div>

                  {/* Total */}
                  <div className="mono tabular-nums" style={{ textAlign: "right", fontWeight: 600, fontSize: 14 }}>
                    {record ? fmtThb(total) : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </div>

                  {/* Cash column */}
                  <div className="mono tabular-nums" style={{ textAlign: "right", fontSize: 12, color: isBankTransfer ? "var(--fg-4)" : "var(--fg)" }}>
                    {record
                      ? (isBankTransfer ? "—" : fmtThb(total))
                      : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </div>
                  {/* Transfer column */}
                  <div className="mono tabular-nums" style={{ textAlign: "right", fontSize: 12, color: isBankTransfer ? "var(--fg)" : "var(--fg-4)" }}>
                    {record
                      ? (isBankTransfer ? fmtThb(total) : "—")
                      : <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {rows.length === 0 && (
              <div style={{ padding: "48px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--fg-4)" }}>
                  {employees.length === 0
                    ? "Add employees in Admin to start tracking payments."
                    : "No employees assigned to this location. Use Generate period to create records."}
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
                <div className="mono tabular-nums" style={{ textAlign: "right", color: "var(--fg)" }}>
                  {totals.base > 0 ? fmtThb(totals.base) : "—"}
                </div>
                <div className="mono tabular-nums" style={{ textAlign: "right", color: "var(--fg)" }}>
                  {totals.sc > 0 ? fmtThb(totals.sc) : "—"}
                </div>
                <div className="mono tabular-nums" style={{ textAlign: "right", color: totals.adj !== 0 ? (totals.adj > 0 ? "var(--good)" : "var(--bad)") : "var(--fg-4)" }}>
                  {totals.adj !== 0 ? `${totals.adj > 0 ? "+" : "−"}${fmtThb(Math.abs(totals.adj))}` : "—"}
                </div>
                <div className="mono tabular-nums" style={{ textAlign: "right", fontSize: 15, color: "var(--bronze)" }}>
                  {fmtThb(totals.total)}
                </div>
                <div />
                <div />
              </div>
            )}
          </div>

          <p style={{ fontSize: 11, color: "var(--fg-4)" }}>
            Click <strong>Generate period</strong> to snapshot base salary and service charge for every employee. Click Base salary or Adjustments to edit — every change needs a reason.
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
                </button>
              );
            })}
            {rows.filter(r => r.record).length === 0 && (
              <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "var(--fg-4)" }}>
                No records yet. Run Generate period.
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
              </div>

              {/* Breakdown */}
              <div style={{ padding: "var(--s-5)", flex: 1 }}>
                <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: "var(--s-3)" }}>Pay breakdown</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--fg-3)" }}>Base salary</span>
                    <span className="mono tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>
                      {selectedRecord.base_salary > 0 ? fmtThb(selectedRecord.base_salary) : "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--fg-3)" }}>Service charge</span>
                    <span className="mono tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>
                      {selectedRecord.service_charge > 0 ? fmtThb(selectedRecord.service_charge) : "—"}
                    </span>
                  </div>

                  {selectedRecord.adjustments.length > 0 && (
                    <div style={{ paddingTop: "var(--s-2)", display: "flex", flexDirection: "column", gap: 4 }}>
                      <span className="eyebrow" style={{ color: "var(--fg-4)" }}>Adjustments</span>
                      {selectedRecord.adjustments.map((a) => (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>{a.reason}</span>
                          <span className="mono tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: a.amount >= 0 ? "var(--good)" : "var(--bad)", whiteSpace: "nowrap" }}>
                            {a.amount >= 0 ? "+" : "−"}{fmtThb(Math.abs(a.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--s-2)", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--s-1)" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>Total</span>
                    <span className="mono tabular-nums" style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>
                      {fmtThb(totalPayment(selectedRecord))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div style={{ padding: "var(--s-4) var(--s-5)", borderTop: "1px solid var(--line)", display: "flex", gap: "var(--s-2)" }}>
                <Button size="sm" variant="secondary" style={{ gap: 6 }} onClick={() => openAdjustmentsModal(selectedRecord, selectedEmployee)}>
                  <PlusIcon size={13} />Adjustment
                </Button>
                <Button size="sm" variant="secondary" style={{ gap: 6 }} onClick={() => exportPaymentsPdf({ employee: selectedEmployee, record: selectedRecord })}>
                  <PrinterIcon size={13} />Slip PDF
                </Button>
              </div>
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
                onSubmit={(e) => { e.preventDefault(); void handleEmployeeSave(); }}
                onCancel={() => setEmployeeModal(null)}
                submitLabel="Save changes"
              />
            </div>
          </div>
        </div>
      )}

      {/* Base salary override modal */}
      {baseSalaryModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
            padding: "var(--s-4)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setBaseSalaryModal(null); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 360,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", boxShadow: "var(--shadow-2)",
              padding: "var(--s-5)", display: "flex", flexDirection: "column", gap: "var(--s-4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
                Override base salary — {baseSalaryModal.emp.first_name}
              </h2>
              <button
                type="button"
                onClick={() => setBaseSalaryModal(null)}
                style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
              >
                <XIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: "var(--fg-4)" }}>
              Employee&apos;s base salary is {fmtThb(baseSalaryModal.emp.base_salary_monthly ?? 0)}/mo. Overriding it here only affects this period&apos;s record.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Base salary (฿)</label>
              <input
                type="number" step="1" autoFocus
                value={baseSalaryValue}
                onChange={(e) => setBaseSalaryValue(e.target.value)}
                style={{
                  height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                  background: "var(--bg-2)", padding: "0 var(--s-3)",
                  fontSize: 14, color: "var(--fg)", outline: "none", width: "100%",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Reason <span style={{ color: "var(--bad)" }}>*</span></label>
              <input
                type="text"
                value={baseSalaryReason}
                onChange={(e) => setBaseSalaryReason(e.target.value)}
                placeholder="e.g. started mid-month, 12 working days"
                style={{
                  height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                  background: "var(--bg-2)", padding: "0 var(--s-3)",
                  fontSize: 13, color: "var(--fg)", outline: "none", width: "100%",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "var(--s-2)" }}>
              <Button type="button" variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => setBaseSalaryModal(null)} disabled={baseSalarySaving}>
                Cancel
              </Button>
              <Button type="button" size="sm" style={{ flex: 1 }} onClick={() => void handleBaseSalarySave()} disabled={baseSalarySaving}>
                {baseSalarySaving ? <Loader2Icon size={14} className="animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustments modal */}
      {adjustmentsModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(43,35,27,0.55)", backdropFilter: "blur(2px)",
            padding: "var(--s-4)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAdjustmentsModal(null); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 420,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", boxShadow: "var(--shadow-2)",
              padding: "var(--s-5)", display: "flex", flexDirection: "column", gap: "var(--s-4)",
              maxHeight: "85vh", overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
                Adjustments — {adjustmentsModal.emp.first_name}
              </h2>
              <button
                type="button"
                onClick={() => setAdjustmentsModal(null)}
                style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
              >
                <XIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Existing adjustments */}
            {adjustmentsModal.record.adjustments.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {adjustmentsModal.record.adjustments.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                      background: "var(--bg-2)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="mono tabular-nums" style={{ fontSize: 13, fontWeight: 500, color: a.amount >= 0 ? "var(--good)" : "var(--bad)" }}>
                        {a.amount >= 0 ? "+" : "−"}{fmtThb(Math.abs(a.amount))}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-4)" }}>{a.reason}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAdjustment(a.id)}
                      disabled={adjDeletingId === a.id}
                      style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                      title="Remove"
                    >
                      {adjDeletingId === a.id ? <Loader2Icon size={14} className="animate-spin" /> : <Trash2Icon size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--fg-4)" }}>No adjustments yet.</p>
            )}

            {/* Add new */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)", paddingTop: "var(--s-2)", borderTop: "1px solid var(--line)" }}>
              <p className="eyebrow" style={{ color: "var(--fg-4)" }}>Add adjustment</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Amount (฿) — negative to deduct</label>
                <input
                  type="number" step="1"
                  value={newAdjAmount}
                  onChange={(e) => setNewAdjAmount(e.target.value)}
                  placeholder="e.g. -500 or 1500"
                  style={{
                    height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                    background: "var(--bg-2)", padding: "0 var(--s-3)",
                    fontSize: 14, color: "var(--fg)", outline: "none", width: "100%",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Reason <span style={{ color: "var(--bad)" }}>*</span></label>
                <input
                  type="text"
                  value={newAdjReason}
                  onChange={(e) => setNewAdjReason(e.target.value)}
                  placeholder="e.g. missed shift on the 12th"
                  style={{
                    height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                    background: "var(--bg-2)", padding: "0 var(--s-3)",
                    fontSize: 13, color: "var(--fg)", outline: "none", width: "100%",
                  }}
                />
              </div>
              <Button type="button" size="sm" onClick={() => void handleAddAdjustment()} disabled={adjSaving}>
                {adjSaving ? <Loader2Icon size={14} className="animate-spin" /> : <>Add adjustment</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
