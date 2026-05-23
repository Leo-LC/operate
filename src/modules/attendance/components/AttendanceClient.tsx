"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon, ChevronRightIcon,
  Loader2Icon, SettingsIcon, XIcon, CheckIcon,
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
import type { PaymentRecord } from "@/modules/payments/types";

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
  { value: "overtime_weekday", label: "Overtime (1.5×)" },
  { value: "paid_leave", label: "Paid leave" },
  { value: "sick_leave", label: "Sick leave" },
  { value: "unpaid_leave", label: "Unpaid leave" },
  { value: "absence", label: "Absence" },
];

function schedKey(empId: string, date: string) { return `${empId}__${date}`; }
function fmtThb(n: number) { return `฿${Math.round(n).toLocaleString()}`; }
function fmtTime(t: string | null) {
  if (!t) return null;
  const parts = t.split(":");
  return `${parts[0]}:${parts[1]}`;
}
function dayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay(); // 0=Sun, 6=Sat
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
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // HR settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<HrSettings>(DEFAULT_HR_SETTINGS);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Cell modal
  const [modal, setModal] = useState<{ empId: string; date: string; emp: Employee } | null>(null);
  const [modalType, setModalType] = useState<"none" | RecordType>("none");
  const [modalHours, setModalHours] = useState("2");
  const [modalSaving, setModalSaving] = useState(false);

  // Deduction inline edit
  const [editingDeductEmpId, setEditingDeductEmpId] = useState<string | null>(null);
  const [editDeductValue, setEditDeductValue] = useState("");
  const [deductSaving, setDeductSaving] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const [recRes, empRes, settRes, shiftsRes, payRes] = await Promise.all([
        fetch(`/api/attendance?month=${monthStr}&location_id=${encodeURIComponent(locationId)}`),
        fetch("/api/admin/employees"),
        fetch("/api/admin/hr-settings"),
        fetch(`/api/attendance/scheduled-hours?month=${monthStr}&location_id=${encodeURIComponent(locationId)}`),
        fetch(`/api/payments?year=${year}&month=${month}&location_id=${encodeURIComponent(locationId)}`),
      ]);
      const [recData, empData, settData, shiftsData, payData] = await Promise.all([
        recRes.json(), empRes.json(), settRes.json(), shiftsRes.json(), payRes.json(),
      ]);
      setRecords(Array.isArray(recData) ? (recData as AttendanceRecord[]) : []);
      setEmployees(Array.isArray(empData) ? (empData as Employee[]) : []);
      setShifts(Array.isArray(shiftsData) ? (shiftsData as ShiftEntry[]) : []);
      setPaymentRecords(Array.isArray(payData) ? (payData as PaymentRecord[]) : []);
      const s =
        settData && typeof settData === "object" && !("error" in settData)
          ? (settData as HrSettings)
          : DEFAULT_HR_SETTINGS;
      setSettings(s);
      setSettingsForm(s);
    } finally {
      setLoading(false);
    }
  }, [locationId, monthStr, year, month]);

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
    for (const s of shifts) {
      m.set(schedKey(s.employee_id, s.shift_date), s.start_time ? "work" : "off");
    }
    return m;
  }, [shifts]);

  // empId__date → ShiftEntry (for start/end time display in modal)
  const shiftInfoMap = useMemo(() => {
    const m = new Map<string, ShiftEntry>();
    for (const s of shifts) m.set(schedKey(s.employee_id, s.shift_date), s);
    return m;
  }, [shifts]);

  // empId__date → AttendanceRecord (last record wins if multiple types)
  const excMap = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    // Leave/absence takes priority over OT if both exist
    const priority = (r: AttendanceRecord) => (OT_TYPES.includes(r.record_type) ? 0 : 1);
    for (const r of records) {
      const key = schedKey(r.employee_id, r.record_date);
      const existing = m.get(key);
      if (!existing || priority(r) > priority(existing)) m.set(key, r);
    }
    return m;
  }, [records]);

  // empId → PaymentRecord
  const paymentMap = useMemo(() => {
    const m = new Map<string, PaymentRecord>();
    for (const p of paymentRecords) m.set(p.employee_id, p);
    return m;
  }, [paymentRecords]);

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
        const deduction = paymentMap.get(emp.id)?.deductions ?? 0;
        return { ...sm, scheduledDays, deduction };
      }),
    [locationEmployees, records, settings, dayNumbers, year, month, schedMap, paymentMap],
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
    const sched = schedMap.get(schedKey(emp.id, dateStr));
    if (!sched) return;
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
    // Find ALL records for this employee+date to handle deletions properly
    const allExistingForDate = records.filter(
      (r) => r.employee_id === modal.empId && r.record_date === modal.date,
    );
    try {
      if (modalType === "none") {
        // Delete all exceptions for this day
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
          body: JSON.stringify({
            record_type: modalType,
            hours: isOt ? parseFloat(modalHours) || 1 : null,
          }),
        });
        if (!res.ok) { toast.error("Failed to update"); return; }
        const updated = (await res.json()) as AttendanceRecord;
        // Remove any other records for that date, keep only the updated one
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

  async function saveDeduction(empId: string) {
    setDeductSaving(true);
    try {
      const existing = paymentMap.get(empId);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          employee_id: empId,
          period_year: year,
          period_month: month,
          deductions: parseFloat(editDeductValue) || 0,
          base_salary: existing?.base_salary ?? 0,
          scheduled_hours: existing?.scheduled_hours ?? 0,
          missed_hours: existing?.missed_hours ?? 0,
          hourly_rate_snapshot: existing?.hourly_rate_snapshot ?? 0,
          overtime_pay: existing?.overtime_pay ?? 0,
          service_charge: existing?.service_charge ?? 0,
          service_charge_is_manual: existing?.service_charge_is_manual ?? false,
          bonus_amount: existing?.bonus_amount ?? 0,
          credit_hours_applied: existing?.credit_hours_applied ?? 0,
          payment_method: existing?.payment_method ?? "cash",
          status: existing?.status ?? "draft",
          notes: existing?.notes ?? null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save deduction"); return; }
      const updated = (await res.json()) as PaymentRecord;
      setPaymentRecords((prev) => {
        const idx = prev.findIndex((p) => p.employee_id === empId);
        if (idx >= 0) { const arr = [...prev]; arr[idx] = updated; return arr; }
        return [...prev, updated];
      });
      setEditingDeductEmpId(null);
      toast.success("Deduction saved");
    } finally {
      setDeductSaving(false);
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
    const base = "flex h-7 w-7 items-center justify-center rounded text-[9px] font-semibold transition-opacity select-none";

    if (!sched) return `${base} bg-muted/30 text-transparent`;

    if (exc) {
      if (OT_TYPES.includes(exc.record_type))
        return `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 cursor-pointer hover:opacity-75`;
      if (exc.record_type === "absence")
        return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-pointer hover:opacity-75`;
      if (exc.record_type === "sick_leave")
        return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-pointer hover:opacity-75`;
      if (exc.record_type === "unpaid_leave")
        return `${base} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 cursor-pointer hover:opacity-75`;
      // paid_leave / public_holiday
      return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-pointer hover:opacity-75`;
    }

    if (sched === "off")
      return `${base} bg-muted/50 text-muted-foreground/60 cursor-pointer hover:opacity-75`;

    // Working day, no exception
    return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 cursor-pointer hover:opacity-75`;
  }

  function getCellLabel(empId: string, dateStr: string): string {
    const key = schedKey(empId, dateStr);
    const sched = schedMap.get(key);
    if (!sched) return "";
    const exc = excMap.get(key);
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
  const modalShift = modal
    ? shiftInfoMap.get(schedKey(modal.empId, modal.date)) ?? null
    : null;
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
            Click any scheduled day to log overtime or leave
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
            <label className="text-xs font-medium text-muted-foreground">OT weekday ×</label>
            <input
              type="number" min="1" max="5" step="0.1" value={settingsForm.overtime_weekday_multiplier}
              onChange={(e) =>
                setSettingsForm((f) => ({
                  ...f, overtime_weekday_multiplier: parseFloat(e.target.value) || 1.5,
                }))
              }
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">OT weekend ×</label>
            <input
              type="number" min="1" max="5" step="0.1" value={settingsForm.overtime_weekend_multiplier}
              onChange={(e) =>
                setSettingsForm((f) => ({
                  ...f, overtime_weekend_multiplier: parseFloat(e.target.value) || 2.0,
                }))
              }
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">OT holiday ×</label>
            <input
              type="number" min="1" max="5" step="0.1" value={settingsForm.overtime_holiday_multiplier}
              onChange={(e) =>
                setSettingsForm((f) => ({
                  ...f, overtime_holiday_multiplier: parseFloat(e.target.value) || 2.0,
                }))
              }
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
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
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Schedule — {monthName}
              </h2>
              {!hasSchedule && (
                <span className="text-[11px] text-muted-foreground">
                  No published schedule —{" "}
                  <a href="/dashboard/scheduling" className="underline hover:text-foreground">
                    create one
                  </a>{" "}
                  to see the grid
                </span>
              )}
              <div className="flex items-center gap-3 ml-auto text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />
                  Working
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-muted/50" />
                  Off
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-blue-100 dark:bg-blue-900/40" />
                  OT
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-amber-100 dark:bg-amber-900/30" />
                  Leave
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-red-100 dark:bg-red-900/30" />
                  Absence
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <div className="min-w-max">
                {/* Day header row */}
                <div className="flex border-b border-border bg-muted/30">
                  <div className="w-32 shrink-0 border-r border-border px-3 py-2 text-[10px] font-medium text-muted-foreground" />
                  {dayNumbers.map((d) => {
                    const dow = dayOfWeek(year, month, d);
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <div
                        key={d}
                        className={`flex h-9 w-8 shrink-0 flex-col items-center justify-center text-[10px] font-medium ${
                          isWeekend ? "text-muted-foreground/50" : "text-muted-foreground"
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
                      const label = getCellLabel(emp.id, dateStr);
                      return (
                        <div key={d} className="flex w-8 shrink-0 items-center justify-center py-1.5">
                          <div
                            className={getCellStyle(emp.id, dateStr)}
                            onClick={() => handleCellClick(emp, dateStr)}
                            title={dateStr}
                          >
                            {label}
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
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40">
                      Employee
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                      Scheduled
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                      Absence
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                      Sick
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                      Unpaid
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                      OT (wd)
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                      OT (we)
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">
                      OT (hol)
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">
                      OT pay
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">
                      Deduction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summaries.map((sm) => (
                    <tr key={sm.employee_id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium sticky left-0 bg-card text-sm">
                        {sm.employee_name}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums text-muted-foreground">
                        {sm.scheduledDays > 0 ? `${sm.scheduledDays}d` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                        {sm.absence_days > 0
                          ? <span className="text-destructive">{sm.absence_days}d</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                        {sm.sick_leave_days > 0
                          ? <span className="text-amber-600 dark:text-amber-400">{sm.sick_leave_days}d</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                        {sm.unpaid_leave_days > 0
                          ? <span className="text-orange-600 dark:text-orange-400">{sm.unpaid_leave_days}d</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                        {sm.ot_weekday_hours > 0
                          ? <span className="text-blue-600 dark:text-blue-400">{sm.ot_weekday_hours}h</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                        {sm.ot_weekend_hours > 0
                          ? <span className="text-indigo-600 dark:text-indigo-400">{sm.ot_weekend_hours}h</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                        {sm.ot_holiday_hours > 0
                          ? <span className="text-purple-600 dark:text-purple-400">{sm.ot_holiday_hours}h</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums font-medium">
                        {sm.ot_pay > 0
                          ? <span className="text-blue-600 dark:text-blue-400">{fmtThb(sm.ot_pay)}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                        {editingDeductEmpId === sm.employee_id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number" min="0" step="1"
                              value={editDeductValue}
                              onChange={(e) => setEditDeductValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveDeduction(sm.employee_id);
                                if (e.key === "Escape") setEditingDeductEmpId(null);
                              }}
                              autoFocus
                              className="h-6 w-24 rounded border border-input bg-background px-1.5 text-xs text-right"
                            />
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                              disabled={deductSaving}
                              onClick={() => void saveDeduction(sm.employee_id)}
                            >
                              {deductSaving
                                ? <Loader2Icon className="size-3.5 animate-spin" />
                                : <CheckIcon className="size-3.5" />}
                            </button>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingDeductEmpId(null)}
                            >
                              <XIcon className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={`tabular-nums hover:underline transition-colors ${
                              sm.deduction > 0
                                ? "text-destructive font-medium"
                                : "text-muted-foreground/40"
                            }`}
                            onClick={() => {
                              setEditingDeductEmpId(sm.employee_id);
                              setEditDeductValue(String(sm.deduction));
                            }}
                            title="Click to edit deduction"
                          >
                            {sm.deduction > 0 ? fmtThb(sm.deduction) : "฿0"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {summaries.length > 0 && (
                  <tfoot className="border-t-2 border-border bg-muted/20">
                    <tr className="font-semibold">
                      <td className="px-4 py-2.5 text-xs sticky left-0 bg-muted/20">Total</td>
                      <td colSpan={7} />
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                        {summaries.reduce((s, sm) => s + sm.ot_pay, 0) > 0
                          ? fmtThb(summaries.reduce((s, sm) => s + sm.ot_pay, 0))
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-destructive">
                        {summaries.reduce((s, sm) => s + sm.deduction, 0) > 0
                          ? fmtThb(summaries.reduce((s, sm) => s + sm.deduction, 0))
                          : "—"}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
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
                {modalShift && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {modalSched === "off"
                      ? "Day off"
                      : modalShift.start_time
                        ? `Shift: ${fmtTime(modalShift.start_time)} – ${fmtTime(modalShift.end_time)}`
                        : "Day off"}
                  </p>
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
                  {modalSaving ? <><Loader2Icon className="size-3.5 animate-spin mr-1.5" />Saving…</> : "Save"}
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
