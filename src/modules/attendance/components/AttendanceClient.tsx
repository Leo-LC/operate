"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon, ChevronRightIcon,
  Loader2Icon, SettingsIcon, XIcon,
} from "lucide-react";
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

  // Summary inline quick-add (OT or leave)
  const [summaryEdit, setSummaryEdit] = useState<{
    empId: string; type: "ot" | "leave";
  } | null>(null);
  const [summaryHours, setSummaryHours] = useState("1");
  const [summaryNote, setSummaryNote] = useState("");
  const [summaryDate, setSummaryDate] = useState("");
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
        const totalUnpaidDays = sm.absence_days + sm.sick_leave_days + sm.unpaid_leave_days;
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

  function openSummaryEdit(empId: string, type: "ot" | "leave") {
    // Default date: today if in current month, else last day of the displayed month
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
    const defaultDate = isCurrentMonth
      ? today.toISOString().slice(0, 10)
      : `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    setSummaryEdit({ empId, type });
    setSummaryHours("1");
    setSummaryNote("");
    setSummaryDate(defaultDate);
  }

  async function saveSummaryEdit() {
    if (!summaryEdit || !summaryDate) return;
    setSummarySaving(true);
    try {
      const recordType = summaryEdit.type === "ot" ? "overtime_weekday" : "unpaid_leave";
      const isOt = summaryEdit.type === "ot";
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          employee_id: summaryEdit.empId,
          record_date: summaryDate,
          record_type: recordType,
          hours: isOt ? parseFloat(summaryHours) || 1 : undefined,
          note: summaryNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Failed to save");
        return;
      }
      const created = (await res.json()) as AttendanceRecord;
      setRecords((prev) => [...prev, created]);
      toast.success("Saved");
      setSummaryEdit(null);
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

  function getCellStyle(empId: string, dateStr: string): string {
    const key = schedKey(empId, dateStr);
    const sched = schedMap.get(key);
    const exc = excMap.get(key);
    const base = "flex h-7 w-7 items-center justify-center rounded text-[9px] font-semibold transition-opacity select-none cursor-pointer";

    if (exc) {
      if (OT_TYPES.includes(exc.record_type))
        return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:opacity-75`;
      if (exc.record_type === "absence")
        return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:opacity-75`;
      if (exc.record_type === "sick_leave")
        return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:opacity-75`;
      if (DEDUCTIBLE.has(exc.record_type))
        return `${base} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:opacity-75`;
      return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:opacity-75`;
    }

    if (!sched) return `${base} bg-muted/20 text-transparent hover:bg-muted/40`;
    if (sched === "off") return `${base} bg-muted/50 text-muted-foreground/60 hover:opacity-75`;
    return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:opacity-75`;
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

  const hasSchedule = shifts.length > 0;
  const modalShift = modal ? shiftInfoMap.get(schedKey(modal.empId, modal.date)) ?? null : null;
  const modalSched = modal ? schedMap.get(schedKey(modal.empId, modal.date)) : null;
  const modalDateLabel = modal
    ? new Date(modal.date + "T00:00:00").toLocaleDateString("en", {
        weekday: "long", month: "long", day: "numeric",
      })
    : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click any day to log overtime or leave
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm"
          >
            {initialLocations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
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
          {isOwner && (
            <Button
              variant="ghost" size="sm" className="h-8 w-8 p-0"
              onClick={() => setShowSettings((v) => !v)}
              title="HR Settings"
            >
              <SettingsIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* HR Settings panel */}
      {isOwner && showSettings && (
        <form
          onSubmit={(e) => void saveSettings(e)}
          className="rounded-lg border border-border bg-card p-5 flex flex-wrap gap-4 items-end"
        >
          <p className="w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            HR Settings
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Monthly hours divisor</label>
            <input
              type="number" min="1" step="1" value={settingsForm.monthly_hours_divisor}
              onChange={(e) =>
                setSettingsForm((f) => ({ ...f, monthly_hours_divisor: parseFloat(e.target.value) || 208 }))
              }
              className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Base salary ÷ divisor = hourly rate</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">OT rate ×</label>
            <input
              type="number" min="1" max="5" step="0.1" value={settingsForm.overtime_weekday_multiplier}
              onChange={(e) =>
                setSettingsForm((f) => ({
                  ...f,
                  overtime_weekday_multiplier: parseFloat(e.target.value) || 1.5,
                  overtime_weekend_multiplier: parseFloat(e.target.value) || 1.5,
                  overtime_holiday_multiplier: parseFloat(e.target.value) || 1.5,
                }))
              }
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Applied to all overtime (default 1.5×)</p>
          </div>
          <div className="flex gap-2 items-end">
            <Button type="submit" size="sm" disabled={settingsSaving}>
              {settingsSaving ? "Saving…" : "Save settings"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin mr-2" />Loading…
        </div>
      ) : locationEmployees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {employees.length === 0 ? (
            <>No employees yet — <a href="/dashboard/admin/employees" className="underline hover:text-foreground">add your first employee</a>.</>
          ) : (
            "No employees assigned to this location."
          )}
        </div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Schedule — {monthName}
              </h2>
              {!hasSchedule && (
                <span className="text-[11px] text-muted-foreground">
                  No published schedule —{" "}
                  <a href="/dashboard/scheduling" className="underline hover:text-foreground">create one</a>
                </span>
              )}
              <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />Work</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-muted/50" />Off</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-100 dark:bg-blue-900/40" />OT</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-orange-100 dark:bg-orange-900/30" />Unpaid</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-700/40" />Paid leave</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <div className="min-w-max">
                {/* Day header */}
                <div className="flex border-b border-border bg-muted/30">
                  <div className="w-32 shrink-0 border-r border-border" />
                  {dayNumbers.map((d) => {
                    const dow = dayOfWeek(year, month, d);
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <div
                        key={d}
                        className={`flex h-9 w-8 shrink-0 flex-col items-center justify-center text-[10px] font-medium ${
                          isWeekend ? "text-muted-foreground/40" : "text-muted-foreground"
                        }`}
                      >
                        <span>{d}</span>
                        <span className="text-[8px] uppercase">
                          {new Date(year, month - 1, d).toLocaleDateString("en", { weekday: "narrow" })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Employee rows */}
                {locationEmployees.map((emp) => (
                  <div key={emp.id} className="flex border-b border-border last:border-b-0 hover:bg-muted/10">
                    <div className="flex w-32 shrink-0 items-center border-r border-border px-3 py-1.5">
                      <span className="truncate text-xs font-medium">
                        {emp.first_name} {emp.last_name ?? ""}
                      </span>
                    </div>
                    {dayNumbers.map((d) => {
                      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      return (
                        <div key={d} className="flex w-8 shrink-0 items-center justify-center py-1.5">
                          <div
                            className={getCellStyle(emp.id, dateStr)}
                            onClick={() => handleCellClick(emp, dateStr)}
                            title={dateStr}
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
          <div className="flex flex-col gap-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Summary — {monthName}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm min-w-[580px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40">Employee</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground text-xs">Scheduled</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground text-xs">OT hours</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">OT pay</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground text-xs">Unpaid leave</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Deduction</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground text-xs">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summaries.map((sm) => (
                    <tr key={sm.employee_id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium sticky left-0 bg-card text-sm">{sm.employee_name}</td>
                      <td className="px-3 py-2.5 text-center text-xs tabular-nums text-muted-foreground">
                        {sm.scheduledDays > 0
                          ? `${sm.scheduledDays}d`
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs tabular-nums">
                        <button
                          type="button"
                          className={`hover:underline transition-colors ${sm.totalOtHours > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/40"}`}
                          onClick={() => openSummaryEdit(sm.employee_id, "ot")}
                          title="Add OT hours"
                        >
                          {sm.totalOtHours > 0 ? `${sm.totalOtHours}h +` : "+ add"}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                        {sm.ot_pay > 0
                          ? <span className="text-blue-600 dark:text-blue-400 font-medium">{fmtThb(sm.ot_pay)}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs tabular-nums">
                        <button
                          type="button"
                          className={`hover:underline transition-colors ${sm.totalUnpaidDays > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground/40"}`}
                          onClick={() => openSummaryEdit(sm.employee_id, "leave")}
                          title="Add unpaid leave"
                        >
                          {sm.totalUnpaidDays > 0 ? `${sm.totalUnpaidDays}d +` : "+ add"}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                        {sm.deduction > 0
                          ? <span className="text-destructive font-medium">{fmtThb(sm.deduction)}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs tabular-nums font-semibold">
                        {sm.ot_pay === 0 && sm.deduction === 0 ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : sm.delta >= 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400">+{fmtThb(sm.delta)}</span>
                        ) : (
                          <span className="text-destructive">{fmtThb(sm.delta)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {summaries.length > 0 && (
                  <tfoot className="border-t-2 border-border bg-muted/20">
                    <tr className="font-semibold text-xs">
                      <td className="px-4 py-2.5 sticky left-0 bg-muted/20">Total</td>
                      <td />
                      <td className="px-3 py-2.5 text-center tabular-nums text-blue-600 dark:text-blue-400">
                        {summaries.reduce((s, sm) => s + sm.totalOtHours, 0) > 0
                          ? `${summaries.reduce((s, sm) => s + sm.totalOtHours, 0)}h` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400">
                        {summaries.reduce((s, sm) => s + sm.ot_pay, 0) > 0
                          ? fmtThb(summaries.reduce((s, sm) => s + sm.ot_pay, 0)) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-orange-600 dark:text-orange-400">
                        {summaries.reduce((s, sm) => s + sm.totalUnpaidDays, 0) > 0
                          ? `${summaries.reduce((s, sm) => s + sm.totalUnpaidDays, 0)}d` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-destructive">
                        {summaries.reduce((s, sm) => s + sm.deduction, 0) > 0
                          ? fmtThb(summaries.reduce((s, sm) => s + sm.deduction, 0)) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {(() => {
                          const d = summaries.reduce((s, sm) => s + sm.delta, 0);
                          if (d === 0) return "—";
                          return d >= 0
                            ? <span className="text-emerald-700 dark:text-emerald-400">+{fmtThb(d)}</span>
                            : <span className="text-destructive">{fmtThb(d)}</span>;
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Delta = OT pay − unpaid leave deduction · reported to Payments on Calculate period
            </p>
          </div>
        </>
      )}

      {/* Summary quick-add modal */}
      {summaryEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSummaryEdit(null); }}
        >
          <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-xl mx-4">
            <div className="flex items-center justify-between border-b border-border p-4">
              <p className="font-semibold text-sm">
                {summaryEdit.type === "ot" ? "Add overtime hours" : "Add unpaid leave day"}
              </p>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setSummaryEdit(null)}>
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={summaryDate}
                  onChange={(e) => setSummaryDate(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              {summaryEdit.type === "ot" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Hours</label>
                  <input
                    type="number" min="0.5" max="24" step="0.5"
                    value={summaryHours}
                    onChange={(e) => setSummaryHours(e.target.value)}
                    className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
                <input
                  type="text"
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  placeholder="e.g. Extra shift"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" disabled={summarySaving || !summaryDate} onClick={() => void saveSummaryEdit()}>
                  {summarySaving ? <><Loader2Icon className="size-3.5 animate-spin mr-1.5" />Saving…</> : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSummaryEdit(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cell modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl mx-4">
            <div className="flex items-start justify-between border-b border-border p-4">
              <div>
                <p className="font-semibold text-sm">
                  {modal.emp.first_name} {modal.emp.last_name ?? ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{modalDateLabel}</p>
                {modalShift ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {modalSched === "off" || !modalShift.start_time
                      ? "Day off"
                      : `Shift: ${fmtTime(modalShift.start_time)} – ${fmtTime(modalShift.end_time)}`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Not scheduled</p>
                )}
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                onClick={() => setModal(null)}
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Exception</label>
                <select
                  value={modalType}
                  onChange={(e) => setModalType(e.target.value as "none" | RecordType)}
                  className="h-9 rounded-md border border-input bg-background pl-3 pr-7 text-sm"
                >
                  {MODAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {modalType !== "none" && OT_TYPES.includes(modalType) && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Overtime hours</label>
                  <input
                    type="number" min="0.5" max="24" step="0.5"
                    value={modalHours}
                    onChange={(e) => setModalHours(e.target.value)}
                    className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm" className="flex-1"
                  disabled={modalSaving}
                  onClick={() => void saveModal()}
                >
                  {modalSaving
                    ? <><Loader2Icon className="size-3.5 animate-spin mr-1.5" />Saving…</>
                    : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setModal(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
