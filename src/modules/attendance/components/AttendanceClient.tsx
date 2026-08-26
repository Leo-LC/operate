"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon, ChevronRightIcon,
  Loader2Icon, PrinterIcon, SettingsIcon, XIcon,
} from "lucide-react";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
import { Button } from "@/components/ui/button";
import {
  type AttendanceRecord,
  type HrSettings,
  type RecordType,
  OT_TYPES,
  DEFAULT_HR_SETTINGS,
  buildSummary,
} from "@/modules/attendance/types";
import type { Employee, AdminLocation } from "@/modules/admin/types";
import { PageHeader } from "@/components/ui/page-header";

interface ShiftEntry {
  employee_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
}

interface Props {
  initialLocations: AdminLocation[];
  isOwner: boolean;
}

const MODAL_OPTIONS: { value: "none" | RecordType; label: string }[] = [
  { value: "none", label: "None (clear exception)" },
  { value: "overtime_weekday", label: "Overtime" },
  { value: "paid_leave", label: "Paid leave" },
  { value: "unpaid_leave", label: "Unpaid leave" },
];

const DEDUCTIBLE = new Set<RecordType>(["absence", "sick_leave", "unpaid_leave"]);

const INITIALS: Record<string, string> = {
  overtime_weekday: "OT",
  overtime_weekend: "OT",
  overtime_holiday: "OT",
  absence: "ABS",
  sick_leave: "SL",
  unpaid_leave: "UL",
  paid_leave: "PL",
  public_holiday: "PH",
};

function schedKey(empId: string, date: string) { return `${empId}__${date}`; }
function fmtThb(n: number) { return `฿${Math.round(n).toLocaleString()}`; }
function fmtTime(t: string | null) {
  if (!t) return null;
  const p = t.split(":");
  return `${p[0]}:${p[1]}`;
}
function dayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

export function AttendanceClient({ initialLocations, isOwner }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [locationId, setLocationId] = useState(initialLocations[0]?.id ?? "");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<HrSettings>(DEFAULT_HR_SETTINGS);
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // HR settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<HrSettings>(DEFAULT_HR_SETTINGS);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Summary inline SET-TOTAL inputs
  const [summaryOtEditId, setSummaryOtEditId] = useState<string | null>(null);
  const [summaryOtValue, setSummaryOtValue] = useState("");
  const [summaryLeaveEditId, setSummaryLeaveEditId] = useState<string | null>(null);
  const [summaryLeaveValue, setSummaryLeaveValue] = useState("");
  const [summarySaving, setSummarySaving] = useState(false);

  // Cell modal
  const [modal, setModal] = useState<{ empId: string; date: string; emp: Employee } | null>(null);
  const [modalType, setModalType] = useState<"none" | RecordType>("none");
  const [modalHours, setModalHours] = useState("2");
  const [modalSaving, setModalSaving] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const [recRes, empRes, settRes, shiftsRes] = await Promise.all([
        fetch(`/api/attendance?month=${monthStr}&location_id=${encodeURIComponent(locationId)}`),
        fetch("/api/admin/employees"),
        fetch("/api/admin/hr-settings"),
        fetch(`/api/attendance/scheduled-hours?month=${monthStr}&location_id=${encodeURIComponent(locationId)}`),
      ]);
      const [recData, empData, settData, shiftsData] = await Promise.all([
        recRes.json(), empRes.json(), settRes.json(), shiftsRes.json(),
      ]);
      setRecords(Array.isArray(recData) ? (recData as AttendanceRecord[]) : []);
      setEmployees(Array.isArray(empData) ? (empData as Employee[]) : []);
      setShifts(Array.isArray(shiftsData) ? (shiftsData as ShiftEntry[]) : []);
      const s =
        settData && typeof settData === "object" && !("error" in settData)
          ? (settData as HrSettings)
          : DEFAULT_HR_SETTINGS;
      setSettings(s);
      setSettingsForm(s);
    } finally {
      setLoading(false);
    }
  }, [locationId, monthStr]);

  useEffect(() => { void loadData(); }, [loadData]);

  const locationEmployees = useMemo(
    () =>
      employees.filter(
        (e) =>
          !e.archived_at &&
          (e.employee_locations?.some((el) => el.location_id === locationId) ||
            e.location_id === locationId),
      ),
    [employees, locationId],
  );

  // empId__date → "work" | "off"
  const schedMap = useMemo(() => {
    const m = new Map<string, "work" | "off">();
    for (const s of shifts) m.set(schedKey(s.employee_id, s.shift_date), s.start_time ? "work" : "off");
    return m;
  }, [shifts]);

  // empId__date → ShiftEntry
  const shiftInfoMap = useMemo(() => {
    const m = new Map<string, ShiftEntry>();
    for (const s of shifts) m.set(schedKey(s.employee_id, s.shift_date), s);
    return m;
  }, [shifts]);

  // empId__date → primary AttendanceRecord (leave > OT when conflict)
  const excMap = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    const priority = (r: AttendanceRecord) => (OT_TYPES.includes(r.record_type) ? 0 : 1);
    for (const r of records) {
      const key = schedKey(r.employee_id, r.record_date);
      const existing = m.get(key);
      if (!existing || priority(r) > priority(existing)) m.set(key, r);
    }
    return m;
  }, [records]);

  const summaries = useMemo(
    () =>
      locationEmployees.map((emp) => {
        const sm = buildSummary(
          emp.id,
          `${emp.first_name} ${emp.last_name ?? ""}`.trim(),
          emp.base_salary_monthly,
          emp.has_thai_bank_account,
          records.filter((r) => r.employee_id === emp.id),
          settings,
        );
        let scheduledDays = 0;
        for (const d of dayNumbers) {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (schedMap.get(schedKey(emp.id, dateStr)) === "work") scheduledDays++;
        }
        const totalOtHours = sm.ot_weekday_hours + sm.ot_weekend_hours + sm.ot_holiday_hours;
        const totalUnpaidDays = records
          .filter((r) => r.employee_id === emp.id && DEDUCTIBLE.has(r.record_type))
          .reduce((sum, r) => sum + (r.hours ?? 1), 0);
        const baseSalary = emp.base_salary_monthly ?? 0;
        const dailyRate = scheduledDays > 0 && baseSalary > 0
          ? baseSalary / scheduledDays
          : baseSalary > 0 ? baseSalary / daysInMonth : 0;
        const deduction = Math.round(totalUnpaidDays * dailyRate);
        const delta = Math.round(sm.ot_pay - deduction);
        return { ...sm, scheduledDays, totalOtHours, totalUnpaidDays, deduction, delta };
      }),
    [locationEmployees, records, settings, dayNumbers, year, month, schedMap, daysInMonth],
  );

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function handleCellClick(emp: Employee, dateStr: string) {
    const exc = excMap.get(schedKey(emp.id, dateStr));
    setModalType(exc ? exc.record_type : "none");
    setModalHours(String(exc?.hours ?? 2));
    setModal({ empId: emp.id, date: dateStr, emp });
  }

  async function saveModal() {
    if (!modal) return;
    setModalSaving(true);
    const key = schedKey(modal.empId, modal.date);
    const existing = excMap.get(key);
    const allExistingForDate = records.filter(
      (r) => r.employee_id === modal.empId && r.record_date === modal.date,
    );
    try {
      if (modalType === "none") {
        await Promise.all(
          allExistingForDate.map((r) => fetch(`/api/attendance/${r.id}`, { method: "DELETE" })),
        );
        setRecords((prev) =>
          prev.filter((r) => !(r.employee_id === modal.empId && r.record_date === modal.date)),
        );
      } else if (existing) {
        const isOt = OT_TYPES.includes(modalType);
        const res = await fetch(`/api/attendance/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record_type: modalType, hours: isOt ? parseFloat(modalHours) || 1 : null }),
        });
        if (!res.ok) { toast.error("Failed to update"); return; }
        const updated = (await res.json()) as AttendanceRecord;
        const others = allExistingForDate.filter((r) => r.id !== existing.id);
        await Promise.all(others.map((r) => fetch(`/api/attendance/${r.id}`, { method: "DELETE" })));
        setRecords((prev) =>
          prev
            .filter((r) => !(r.employee_id === modal.empId && r.record_date === modal.date && r.id !== existing.id))
            .map((r) => (r.id === existing.id ? updated : r)),
        );
      } else {
        const isOt = OT_TYPES.includes(modalType);
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location_id: locationId,
            employee_id: modal.empId,
            record_date: modal.date,
            record_type: modalType,
            hours: isOt ? parseFloat(modalHours) || 1 : undefined,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(err.error ?? "Failed to add");
          return;
        }
        const created = (await res.json()) as AttendanceRecord;
        setRecords((prev) => [...prev, created]);
      }
      toast.success("Saved");
      setModal(null);
    } finally {
      setModalSaving(false);
    }
  }

  async function saveSummaryOt(empId: string) {
    const newHours = parseFloat(summaryOtValue);
    if (isNaN(newHours) || newHours < 0) return;
    setSummarySaving(true);
    const lastDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    try {
      const otRecords = records.filter(
        (r) => r.employee_id === empId && OT_TYPES.includes(r.record_type),
      );
      await Promise.all(otRecords.map((r) => fetch(`/api/attendance/${r.id}`, { method: "DELETE" })));
      setRecords((prev) => prev.filter((r) => !(r.employee_id === empId && OT_TYPES.includes(r.record_type))));
      if (newHours > 0) {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location_id: locationId,
            employee_id: empId,
            record_date: lastDate,
            record_type: "overtime_weekday",
            hours: newHours,
          }),
        });
        if (!res.ok) { toast.error("Failed to save OT"); return; }
        const created = (await res.json()) as AttendanceRecord;
        setRecords((prev) => [...prev, created]);
      }
      toast.success("Saved");
      setSummaryOtEditId(null);
    } finally {
      setSummarySaving(false);
    }
  }

  async function saveSummaryLeave(empId: string) {
    const newDays = parseFloat(summaryLeaveValue);
    if (isNaN(newDays) || newDays < 0) return;
    setSummarySaving(true);
    const lastDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    try {
      const leaveRecords = records.filter(
        (r) => r.employee_id === empId && DEDUCTIBLE.has(r.record_type),
      );
      await Promise.all(leaveRecords.map((r) => fetch(`/api/attendance/${r.id}`, { method: "DELETE" })));
      setRecords((prev) => prev.filter((r) => !(r.employee_id === empId && DEDUCTIBLE.has(r.record_type))));
      if (newDays > 0) {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location_id: locationId,
            employee_id: empId,
            record_date: lastDate,
            record_type: "unpaid_leave",
            hours: newDays,
          }),
        });
        if (!res.ok) { toast.error("Failed to save leave"); return; }
        const created = (await res.json()) as AttendanceRecord;
        setRecords((prev) => [...prev, created]);
      }
      toast.success("Saved");
      setSummaryLeaveEditId(null);
    } finally {
      setSummarySaving(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/hr-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      if (!res.ok) { toast.error("Failed to save settings"); return; }
      const updated = (await res.json()) as HrSettings;
      setSettings(updated);
      setSettingsForm(updated);
      setShowSettings(false);
      toast.success("HR settings saved");
    } finally {
      setSettingsSaving(false);
    }
  }

  function getCellInlineStyle(empId: string, dateStr: string): React.CSSProperties {
    const key = schedKey(empId, dateStr);
    const sched = schedMap.get(key);
    const exc = excMap.get(key);
    const base: React.CSSProperties = {
      display: "flex", width: 26, height: 26, flexShrink: 0,
      alignItems: "center", justifyContent: "center",
      borderRadius: "var(--r-sm)", fontSize: 9, fontWeight: 600,
      cursor: "pointer", userSelect: "none", transition: "opacity var(--dur) var(--ease)",
    };
    if (exc) {
      if (OT_TYPES.includes(exc.record_type))
        return { ...base, background: "var(--info-soft)", color: "var(--info)" };
      if (exc.record_type === "absence")
        return { ...base, background: "var(--bad-soft)", color: "var(--bad)" };
      if (exc.record_type === "sick_leave")
        return { ...base, background: "var(--warn-soft)", color: "var(--warn)" };
      if (DEDUCTIBLE.has(exc.record_type))
        return { ...base, background: "var(--warn-soft)", color: "var(--warn)" };
      return { ...base, background: "var(--good-soft)", color: "var(--good)" };
    }
    if (!sched) return { ...base, background: "transparent", color: "transparent" };
    if (sched === "off") return { ...base, background: "var(--bg-2)", color: "var(--fg-4)" };
    return { ...base, background: "var(--good-soft)", color: "var(--good)" };
  }

  function getCellLabel(empId: string, dateStr: string): string {
    const key = schedKey(empId, dateStr);
    const exc = excMap.get(key);
    const sched = schedMap.get(key);
    if (exc) {
      if (OT_TYPES.includes(exc.record_type)) return "OT";
      if (exc.record_type === "absence") return "ABS";
      if (exc.record_type === "sick_leave") return "SL";
      if (exc.record_type === "unpaid_leave") return "UL";
      if (exc.record_type === "paid_leave") return "PL";
      if (exc.record_type === "public_holiday") return "PH";
    }
    if (sched === "off") return "OFF";
    return "";
  }

  function exportMonthPdf() {
    const locationName = initialLocations.find((l) => l.id === locationId)?.name ?? "All shops";
    const title = `Attendance — ${monthName} — ${escHtml(locationName)}`;

    const excMapLocal = new Map<string, string>();
    for (const r of records) {
      const key = schedKey(r.employee_id, r.record_date);
      const existing = excMapLocal.get(key);
      // prefer leave over OT when conflict (same priority logic as excMap)
      const isOt = OT_TYPES.includes(r.record_type);
      if (!existing || !isOt) excMapLocal.set(key, INITIALS[r.record_type] ?? r.record_type);
    }

    const dayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const padM = String(month).padStart(2, "0");

    const headerCells = dayNums
      .map((d) => {
        const dow = dayOfWeek(year, month, d);
        const isWeekend = dow === 0 || dow === 6;
        return `<th class="${isWeekend ? "weekend" : ""}">${d}<br><span class="dow">${new Date(year, month - 1, d).toLocaleDateString("en", { weekday: "narrow" })}</span></th>`;
      })
      .join("");

    const bodyRows = locationEmployees
      .map((emp, rowIdx) => {
        const cells = dayNums
          .map((d) => {
            const dateStr = `${year}-${padM}-${String(d).padStart(2, "0")}`;
            const key = schedKey(emp.id, dateStr);
            const label = excMapLocal.get(key) ?? "";
            const sched = schedMap.get(key);
            let cls = "empty";
            if (label === "OT") cls = "ot";
            else if (label === "ABS") cls = "abs";
            else if (label === "SL" || label === "UL") cls = "leave";
            else if (label === "PL" || label === "PH") cls = "paid";
            else if (sched === "work") cls = "work";
            else if (sched === "off") cls = "off";
            return `<td class="${cls}">${label || (sched === "work" ? "●" : sched === "off" ? "·" : "")}</td>`;
          })
          .join("");
        const rowCls = rowIdx % 2 === 0 ? "" : ' class="alt"';
        const name = `${escHtml(emp.first_name)} ${escHtml(emp.last_name ?? "")}`.trim();
        return `<tr${rowCls}><td class="name">${name}</td>${cells}</tr>`;
      })
      .join("");

    const css = [
      "*{box-sizing:border-box;margin:0;padding:0}",
      "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:10px;color:#1a1a1a;background:#fff}",
      ".accent{height:5px;background:#1e3a8a;width:100%}",
      ".header{padding:14px 20px 10px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e5e7eb}",
      ".header-left h1{font-size:15px;font-weight:700;color:#111;margin-bottom:3px}",
      ".header-left .meta{font-size:11px;color:#6b7280}",
      ".header-right{text-align:right;font-size:10px;color:#9ca3af}",
      ".content{padding:12px 20px}",
      "table{border-collapse:collapse;width:100%;table-layout:fixed}",
      "col.name-col{width:110px}",
      "th{background:#1e3a8a;color:#fff;font-weight:600;font-size:9px;padding:5px 3px;text-align:center;letter-spacing:0.2px}",
      "th.name-th{text-align:left;padding-left:8px}",
      "th.weekend{background:#2d4fa3}",
      "th .dow{font-weight:400;opacity:0.8}",
      "td{padding:4px 2px;text-align:center;vertical-align:middle;border-bottom:1px solid #f0f0f0;font-size:8.5px;font-weight:500}",
      "tr.alt td{background:#f8fafc}",
      "td.name{text-align:left;font-weight:600;padding-left:8px;color:#374151;font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "td.work{color:#16a34a}td.off{color:#d1d5db}td.empty{color:transparent}",
      "td.ot{color:#2563eb;font-weight:700}",
      "td.abs{color:#dc2626;font-weight:700}",
      "td.leave{color:#d97706;font-weight:700}",
      "td.paid{color:#16a34a;font-weight:700}",
      "@media print{@page{margin:6mm;size:landscape}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent{-webkit-print-color-adjust:exact}}",
    ].join("");

    const colgroup = `<colgroup><col class="name-col">${dayNums.map(() => "<col>").join("")}</colgroup>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<div class="accent"></div>
<div class="header">
  <div class="header-left">
    <h1>${title}</h1>
    <div class="meta">OT = Overtime · ABS = Absence · SL = Sick leave · UL = Unpaid leave · PL = Paid leave · PH = Public holiday</div>
  </div>
  <div class="header-right">Capybara Coffee<br>Internal — Attendance</div>
</div>
<div class="content">
<table>
  ${colgroup}
  <thead><tr><th class="name-th">Employee</th>${headerCells}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const hasSchedule = shifts.length > 0;
  const modalShift = modal ? shiftInfoMap.get(schedKey(modal.empId, modal.date)) ?? null : null;
  const modalSched = modal ? schedMap.get(schedKey(modal.empId, modal.date)) : null;
  const modalDateLabel = modal
    ? new Date(modal.date + "T00:00:00").toLocaleDateString("en", {
        weekday: "long", month: "long", day: "numeric",
      })
    : "";

  const inputSm: React.CSSProperties = {
    height: 28, borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
    background: "var(--bg)", padding: "0 var(--s-2)", fontSize: 12,
    color: "var(--fg)", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}>
      <PageHeader
        eyebrow={monthName}
        title="Attendance"
        subtitle="Click any day cell to log overtime or leave."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              style={{ height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", padding: "0 var(--s-3)", fontSize: 13, color: "var(--fg)", outline: "none" }}
            >
              {initialLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button variant="ghost" size="sm" onClick={prevMonth}>
                <ChevronLeftIcon style={{ width: 14, height: 14 }} />
              </Button>
              <span className="mono" style={{ fontSize: 13, fontWeight: 500, width: 140, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{monthName}</span>
              <Button variant="ghost" size="sm" onClick={nextMonth}>
                <ChevronRightIcon style={{ width: 14, height: 14 }} />
              </Button>
            </div>
            <Button size="sm" variant="secondary" onClick={exportMonthPdf} disabled={locationEmployees.length === 0}>
              <PrinterIcon style={{ width: 14, height: 14 }} />
              Export month
            </Button>
            {isOwner && (
              <Button variant="ghost" size="sm" onClick={() => setShowSettings((v) => !v)} title="HR Settings">
                <SettingsIcon style={{ width: 14, height: 14 }} />
              </Button>
            )}
          </div>
        }
      />

      {/* HR Settings panel */}
      {isOwner && showSettings && (
        <form
          onSubmit={(e) => void saveSettings(e)}
          style={{
            borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
            background: "var(--bg-2)", padding: "var(--s-5)",
            display: "flex", flexWrap: "wrap", gap: "var(--s-4)", alignItems: "flex-end",
          }}
        >
          <p className="eyebrow" style={{ color: "var(--fg-4)", width: "100%" }}>HR Settings</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Monthly hours divisor</label>
            <input
              type="number" min="1" step="1" value={settingsForm.monthly_hours_divisor}
              onChange={(e) => setSettingsForm((f) => ({ ...f, monthly_hours_divisor: parseFloat(e.target.value) || 208 }))}
              style={{ ...inputSm, width: 80 }}
            />
            <p style={{ fontSize: 10, color: "var(--fg-4)" }}>Base salary ÷ divisor = hourly rate</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="eyebrow" style={{ color: "var(--fg-4)" }}>OT rate ×</label>
            <input
              type="number" min="1" max="5" step="0.1" value={settingsForm.overtime_weekday_multiplier}
              onChange={(e) => setSettingsForm((f) => ({
                ...f,
                overtime_weekday_multiplier: parseFloat(e.target.value) || 1.5,
                overtime_weekend_multiplier: parseFloat(e.target.value) || 1.5,
                overtime_holiday_multiplier: parseFloat(e.target.value) || 1.5,
              }))}
              style={{ ...inputSm, width: 72 }}
            />
            <p style={{ fontSize: 10, color: "var(--fg-4)" }}>Applied to all overtime (default 1.5×)</p>
          </div>
          <div style={{ display: "flex", gap: "var(--s-2)", alignItems: "flex-end" }}>
            <Button type="submit" size="sm" variant="primary" disabled={settingsSaving}>
              {settingsSaving ? "Saving…" : "Save settings"}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowSettings(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0", color: "var(--fg-4)", fontSize: 14, gap: 8 }}>
          <Loader2Icon style={{ width: 14, height: 14 }} className="animate-spin" />Loading…
        </div>
      ) : locationEmployees.length === 0 ? (
        <div
          style={{
            borderRadius: "var(--r-lg)", border: "1px dashed var(--line)",
            padding: 40, textAlign: "center", color: "var(--fg-4)", fontSize: 13,
          }}
        >
          {employees.length === 0 ? (
            <>No employees yet — <a href="/admin/employees" style={{ color: "var(--bronze)", textDecoration: "underline" }}>add your first employee</a>.</>
          ) : (
            "No employees assigned to this location."
          )}
        </div>
      ) : (
        <>
          {/* Exception summary */}
          {(() => {
            const withAbsence = summaries.filter((s) => s.absence_days > 0);
            const withOt = summaries.filter((s) => s.totalOtHours > 0);
            const withUnpaid = summaries.filter((s) => s.totalUnpaidDays > 0 && s.absence_days === 0);
            if (withAbsence.length === 0 && withOt.length === 0 && withUnpaid.length === 0) return null;
            return (
              <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
                <div style={{ padding: "8px var(--s-5)", background: "var(--bg-2)", borderBottom: "1px solid var(--line)" }}>
                  <span className="eyebrow" style={{ color: "var(--fg-4)" }}>Attendance issues this month</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {withAbsence.map((s, i) => (
                    <div key={s.employee_id} style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", padding: "10px var(--s-5)", borderTop: i > 0 ? "1px solid var(--line)" : undefined }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--bad)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, minWidth: 140 }}>{s.employee_name}</span>
                      <span style={{ fontSize: 12, color: "var(--bad)" }}>{s.absence_days} absence{s.absence_days > 1 ? "s" : ""}</span>
                    </div>
                  ))}
                  {withUnpaid.map((s, i) => (
                    <div key={s.employee_id} style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", padding: "10px var(--s-5)", borderTop: (i > 0 || withAbsence.length > 0) ? "1px solid var(--line)" : undefined }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warn)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, minWidth: 140 }}>{s.employee_name}</span>
                      <span style={{ fontSize: 12, color: "var(--warn)" }}>{s.totalUnpaidDays}d unpaid leave</span>
                    </div>
                  ))}
                  {withOt.map((s, i) => (
                    <div key={s.employee_id} style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", padding: "10px var(--s-5)", borderTop: (i > 0 || withAbsence.length > 0 || withUnpaid.length > 0) ? "1px solid var(--line)" : undefined }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--info)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, minWidth: 140 }}>{s.employee_name}</span>
                      <span style={{ fontSize: 12, color: "var(--info)" }}>{s.totalOtHours}h OT</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Calendar grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-3)", marginBottom: 2 }}>
              <p className="eyebrow" style={{ color: "var(--fg-4)", margin: 0 }}>Schedule — {monthName}</p>
              {!hasSchedule && (
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>
                  No published schedule —{" "}
                  <a href="/scheduling" style={{ color: "var(--bronze)", textDecoration: "underline" }}>create one</a>
                </span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--fg-4)" }}>
                {[
                  { bg: "var(--good-soft)", label: "Work" },
                  { bg: "var(--bg-2)", label: "Off" },
                  { bg: "var(--info-soft)", label: "OT" },
                  { bg: "var(--warn-soft)", label: "Unpaid" },
                  { bg: "var(--good-soft)", label: "Paid leave" },
                ].map(({ bg, label }) => (
                  <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: bg }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ overflowX: "auto", borderRadius: "var(--r-lg)", border: "1px solid var(--line)" }}>
              <div style={{ minWidth: "max-content" }}>
                {/* Day header */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "var(--bg-2)" }}>
                  <div style={{ width: 128, flexShrink: 0, borderRight: "1px solid var(--line)" }} />
                  {dayNumbers.map((d) => {
                    const dow = dayOfWeek(year, month, d);
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <div
                        key={d}
                        style={{
                          display: "flex", width: 32, height: 36, flexShrink: 0,
                          flexDirection: "column", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 500,
                          borderLeft: "1px solid var(--line)",
                          color: isWeekend ? "var(--fg-mute)" : "var(--fg-3)",
                        }}
                      >
                        <span>{d}</span>
                        <span style={{ fontSize: 8, textTransform: "uppercase" }}>
                          {new Date(year, month - 1, d).toLocaleDateString("en", { weekday: "narrow" })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Employee rows */}
                {locationEmployees.map((emp, empIdx) => (
                  <div
                    key={emp.id}
                    style={{
                      display: "flex",
                      borderTop: empIdx > 0 ? "1px solid var(--line)" : undefined,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                  >
                    <div
                      style={{
                        display: "flex", width: 128, flexShrink: 0,
                        alignItems: "center", borderRight: "1px solid var(--line)",
                        padding: "6px var(--s-3)",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {emp.first_name} {emp.last_name ?? ""}
                      </span>
                    </div>
                    {dayNumbers.map((d) => {
                      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      return (
                        <div
                          key={d}
                          style={{
                            display: "flex", width: 32, flexShrink: 0,
                            alignItems: "center", justifyContent: "center",
                            padding: "4px 0", borderLeft: "1px solid var(--line)",
                          }}
                        >
                          <div
                            style={getCellInlineStyle(emp.id, dateStr)}
                            onClick={() => handleCellClick(emp, dateStr)}
                            title={dateStr}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                          >
                            {getCellLabel(emp.id, dateStr)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
            <p className="eyebrow" style={{ color: "var(--fg-4)" }}>Summary — {monthName}</p>
            <div style={{ overflowX: "auto", borderRadius: "var(--r-lg)", border: "1px solid var(--line)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 580 }}>
                <thead>
                  <tr style={{ background: "var(--bg-2)" }}>
                    {["Employee", "Scheduled", "OT hours", "OT pay", "Unpaid leave", "Deduction", "Delta"].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px var(--s-4)", textAlign: i === 0 ? "left" : "right",
                          color: "var(--fg-3)", fontWeight: 500, fontSize: 12,
                          borderBottom: "1px solid var(--line)",
                          borderLeft: i > 0 ? "1px solid var(--line)" : undefined,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((sm, rowIdx) => (
                    <tr
                      key={sm.employee_id}
                      style={{ borderTop: rowIdx > 0 ? "1px solid var(--line)" : undefined }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--row-hover)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                    >
                      <td style={{ padding: "10px var(--s-4)", fontWeight: 500 }}>{sm.employee_name}</td>
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", color: "var(--fg-3)", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {sm.scheduledDays > 0 ? `${sm.scheduledDays}d` : <span style={{ color: "var(--fg-mute)" }}>—</span>}
                      </td>
                      <td className="mono" style={{ padding: "6px var(--s-4)", textAlign: "right", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {summaryOtEditId === sm.employee_id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                            <input
                              type="number" min="0" step="0.5" autoFocus
                              value={summaryOtValue}
                              onChange={(e) => setSummaryOtValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveSummaryOt(sm.employee_id);
                                if (e.key === "Escape") setSummaryOtEditId(null);
                              }}
                              style={{ ...inputSm, width: 60, textAlign: "center" }}
                              disabled={summarySaving}
                            />
                            <button type="button" style={{ fontSize: 12, color: "var(--good)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }} onClick={() => void saveSummaryOt(sm.employee_id)} disabled={summarySaving}>✓</button>
                            <button type="button" style={{ fontSize: 12, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer" }} onClick={() => setSummaryOtEditId(null)}>✕</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            style={{ fontSize: 12, color: sm.totalOtHours > 0 ? "var(--info)" : "var(--fg-mute)", background: "none", border: "none", cursor: "pointer", fontVariantNumeric: "tabular-nums" }}
                            onClick={() => { setSummaryOtEditId(sm.employee_id); setSummaryOtValue(String(sm.totalOtHours || "")); }}
                            title="Set OT hours total"
                          >
                            {sm.totalOtHours > 0 ? `${sm.totalOtHours}h` : "—"}
                          </button>
                        )}
                      </td>
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {sm.ot_pay > 0
                          ? <span style={{ color: "var(--info)", fontWeight: 500 }}>{fmtThb(sm.ot_pay)}</span>
                          : <span style={{ color: "var(--fg-mute)" }}>—</span>}
                      </td>
                      <td className="mono" style={{ padding: "6px var(--s-4)", textAlign: "right", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {summaryLeaveEditId === sm.employee_id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                            <input
                              type="number" min="0" step="0.5" autoFocus
                              value={summaryLeaveValue}
                              onChange={(e) => setSummaryLeaveValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveSummaryLeave(sm.employee_id);
                                if (e.key === "Escape") setSummaryLeaveEditId(null);
                              }}
                              style={{ ...inputSm, width: 60, textAlign: "center" }}
                              disabled={summarySaving}
                            />
                            <button type="button" style={{ fontSize: 12, color: "var(--good)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }} onClick={() => void saveSummaryLeave(sm.employee_id)} disabled={summarySaving}>✓</button>
                            <button type="button" style={{ fontSize: 12, color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer" }} onClick={() => setSummaryLeaveEditId(null)}>✕</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            style={{ fontSize: 12, color: sm.totalUnpaidDays > 0 ? "var(--warn)" : "var(--fg-mute)", background: "none", border: "none", cursor: "pointer", fontVariantNumeric: "tabular-nums" }}
                            onClick={() => { setSummaryLeaveEditId(sm.employee_id); setSummaryLeaveValue(String(sm.totalUnpaidDays || "")); }}
                            title="Set unpaid leave days total"
                          >
                            {sm.totalUnpaidDays > 0 ? `${sm.totalUnpaidDays}d` : "—"}
                          </button>
                        )}
                      </td>
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {sm.deduction > 0
                          ? <span style={{ color: "var(--bad)", fontWeight: 500 }}>{fmtThb(sm.deduction)}</span>
                          : <span style={{ color: "var(--fg-mute)" }}>—</span>}
                      </td>
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {sm.ot_pay === 0 && sm.deduction === 0 ? (
                          <span style={{ color: "var(--fg-mute)" }}>—</span>
                        ) : sm.delta >= 0 ? (
                          <span style={{ color: "var(--good)" }}>฿ +{Math.round(sm.delta).toLocaleString()}</span>
                        ) : (
                          <span style={{ color: "var(--bad)" }}>฿ {Math.round(sm.delta).toLocaleString()}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {summaries.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "var(--bronze-soft)", borderTop: "2px solid var(--line)", fontWeight: 600, fontSize: 12 }}>
                      <td style={{ padding: "10px var(--s-4)", color: "var(--bronze)" }}>Total</td>
                      <td style={{ borderLeft: "1px solid var(--line)" }} />
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", color: "var(--info)", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {summaries.reduce((s, sm) => s + sm.totalOtHours, 0) > 0
                          ? `${summaries.reduce((s, sm) => s + sm.totalOtHours, 0)}h` : "—"}
                      </td>
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", color: "var(--info)", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {summaries.reduce((s, sm) => s + sm.ot_pay, 0) > 0
                          ? fmtThb(summaries.reduce((s, sm) => s + sm.ot_pay, 0)) : "—"}
                      </td>
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", color: "var(--warn)", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {summaries.reduce((s, sm) => s + sm.totalUnpaidDays, 0) > 0
                          ? `${summaries.reduce((s, sm) => s + sm.totalUnpaidDays, 0)}d` : "—"}
                      </td>
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", color: "var(--bad)", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {summaries.reduce((s, sm) => s + sm.deduction, 0) > 0
                          ? fmtThb(summaries.reduce((s, sm) => s + sm.deduction, 0)) : "—"}
                      </td>
                      <td className="mono" style={{ padding: "10px var(--s-4)", textAlign: "right", fontVariantNumeric: "tabular-nums", borderLeft: "1px solid var(--line)" }}>
                        {(() => {
                          const d = summaries.reduce((s, sm) => s + sm.delta, 0);
                          if (d === 0) return <span style={{ color: "var(--fg-mute)" }}>—</span>;
                          return d >= 0
                            ? <span style={{ color: "var(--good)" }}>฿ +{Math.round(d).toLocaleString()}</span>
                            : <span style={{ color: "var(--bad)" }}>฿ {Math.round(d).toLocaleString()}</span>;
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p style={{ fontSize: 11, color: "var(--fg-4)" }}>
              Delta = OT pay − unpaid leave deduction · reported to Payments on Calculate period
            </p>
          </div>
        </>
      )}

      {/* Cell modal */}
      {modal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--overlay-strong)", backdropFilter: "blur(2px)",
          }}
          onKeyDown={(e) => { if (e.key === "Escape") setModal(null); }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 360,
              borderRadius: "var(--r-lg)", border: "1px solid var(--line)",
              background: "var(--surface)", boxShadow: "var(--shadow-drawer)", margin: "0 var(--s-4)",
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                borderBottom: "1px solid var(--line)", padding: "var(--s-4)",
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                  {modal.emp.first_name} {modal.emp.last_name ?? ""}
                </p>
                <p style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2, marginBottom: 0 }}>{modalDateLabel}</p>
                {modalShift ? (
                  <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2, marginBottom: 0 }}>
                    {modalSched === "off" || !modalShift.start_time
                      ? "Day off"
                      : `Shift: ${fmtTime(modalShift.start_time)} – ${fmtTime(modalShift.end_time)}`}
                  </p>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--fg-mute)", marginTop: 2, marginBottom: 0 }}>Not scheduled</p>
                )}
              </div>
              <button
                type="button"
                style={{ color: "var(--fg-4)", background: "none", border: "none", cursor: "pointer", marginTop: 2 }}
                onClick={() => setModal(null)}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
              >
                <XIcon style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: "var(--s-4)", display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Exception</label>
                <select
                  value={modalType}
                  onChange={(e) => setModalType(e.target.value as "none" | RecordType)}
                  style={{ height: 34, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", padding: "0 var(--s-3)", fontSize: 13, color: "var(--fg)", outline: "none" }}
                >
                  {MODAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {modalType !== "none" && OT_TYPES.includes(modalType) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Overtime hours</label>
                  <input
                    type="number" min="0.5" max="24" step="0.5"
                    value={modalHours}
                    onChange={(e) => setModalHours(e.target.value)}
                    style={{ height: 34, width: 100, borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", padding: "0 var(--s-3)", fontSize: 13, color: "var(--fg)", outline: "none" }}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: "var(--s-2)", paddingTop: 4 }}>
                <Button size="sm" variant="primary" style={{ flex: 1 }} disabled={modalSaving} onClick={() => void saveModal()}>
                  {modalSaving ? <><Loader2Icon style={{ width: 13, height: 13 }} className="animate-spin" /> Saving…</> : "Save"}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
