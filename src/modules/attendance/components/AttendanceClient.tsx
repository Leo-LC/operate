"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PlusIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon,
  Loader2Icon, PencilIcon, CheckIcon, XIcon, SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type AttendanceRecord,
  type HrSettings,
  type RecordType,
  RECORD_TYPE_LABELS,
  RECORD_TYPE_COLORS,
  OT_TYPES,
  DEFAULT_HR_SETTINGS,
  buildSummary,
} from "@/modules/attendance/types";
import type { Employee, AdminLocation } from "@/modules/admin/types";

interface ScheduledHoursEntry {
  employee_id: string;
  scheduled_hours: number;
  shift_count: number;
  shift_dates: string[];
}

const ALL_RECORD_TYPES: RecordType[] = [
  "overtime_weekday", "overtime_weekend", "overtime_holiday",
  "paid_leave", "sick_leave", "unpaid_leave", "public_holiday", "absence",
];

interface Props {
  initialLocations: AdminLocation[];
  isOwner: boolean;
}

function fmtThb(n: number) { return `฿${Math.round(n).toLocaleString()}`; }
function fmtH(h: number) { return `${h % 1 === 0 ? h : h.toFixed(1)}h`; }

export function AttendanceClient({ initialLocations, isOwner }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [locationId, setLocationId] = useState(initialLocations[0]?.id ?? "");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<HrSettings>(DEFAULT_HR_SETTINGS);
  const [scheduledHours, setScheduledHours] = useState<ScheduledHoursEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Add record form
  const [showAdd, setShowAdd] = useState(false);
  const [addEmpId, setAddEmpId] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addType, setAddType] = useState<RecordType>("overtime_weekday");
  const [addHours, setAddHours] = useState("1");
  const [addNote, setAddNote] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<RecordType>("overtime_weekday");
  const [editHours, setEditHours] = useState("1");
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // HR settings edit (owner only)
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<HrSettings>(DEFAULT_HR_SETTINGS);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });

  const loadData = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/attendance?month=${monthStr}&location_id=${encodeURIComponent(locationId)}`),
        fetch("/api/admin/employees"),
        fetch("/api/admin/hr-settings"),
        fetch(`/api/attendance/scheduled-hours?month=${monthStr}&location_id=${encodeURIComponent(locationId)}`),
      ];
      const [recRes, empRes, settRes, schedRes] = await Promise.all(fetches);
      const [recData, empData, settData, schedData] = await Promise.all([
        recRes.json(), empRes.json(), settRes.json(), schedRes.json(),
      ]);
      setRecords(Array.isArray(recData) ? recData as AttendanceRecord[] : []);
      setEmployees(Array.isArray(empData) ? empData as Employee[] : []);
      setScheduledHours(Array.isArray(schedData) ? schedData as ScheduledHoursEntry[] : []);
      const s = settData && typeof settData === "object" && !("error" in settData) ? settData as HrSettings : DEFAULT_HR_SETTINGS;
      setSettings(s);
      setSettingsForm(s);
    } finally {
      setLoading(false);
    }
  }, [locationId, monthStr]);

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

  const summaries = useMemo(() =>
    locationEmployees.map((emp) => {
      const sm = buildSummary(
        emp.id,
        `${emp.first_name} ${emp.last_name}`,
        emp.base_salary_monthly,
        emp.has_thai_bank_account,
        records.filter((r) => r.employee_id === emp.id),
        settings,
      );
      const sched = scheduledHours.find((s) => s.employee_id === emp.id);
      const scheduled_hours = sched?.scheduled_hours ?? null;
      const hourlyRate = emp.base_salary_monthly ? emp.base_salary_monthly / settings.monthly_hours_divisor : 0;

      // Missed hours = sum of shift hours for deductible absence dates
      const schedDates = new Set(sched?.shift_dates ?? []);
      // Each "deductible" leave day: assume one shift per date (8.5h is the typical shift)
      // We calculate per-day hour from scheduled_hours / shift_count for an approximate
      const perShiftHours = sched && sched.shift_count > 0 ? sched.scheduled_hours / sched.shift_count : 0;
      const deductibleDays = sm.absence_days + sm.sick_leave_days + sm.unpaid_leave_days;
      // Only count deductible days that fall on a scheduled shift date
      const empDeductRecords = records.filter(
        (r) => r.employee_id === emp.id && ["absence", "sick_leave", "unpaid_leave"].includes(r.record_type)
      );
      const missedOnScheduledDays = empDeductRecords.filter((r) => schedDates.has(r.record_date)).length;
      const missed_hours = missedOnScheduledDays * perShiftHours;
      const worked_hours = scheduled_hours != null ? scheduled_hours - missed_hours : null;
      const deduction_preview = missed_hours > 0 && hourlyRate > 0 ? missed_hours * hourlyRate : 0;

      return {
        ...sm,
        scheduled_hours,
        shift_count: sched?.shift_count ?? null,
        missed_hours,
        worked_hours,
        deduction_preview,
        hourlyRate,
        deductibleDays,
      };
    }),
    [locationEmployees, records, settings, scheduledHours]
  );

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmpId || !addDate) { toast.error("Select employee and date"); return; }
    setAddSaving(true);
    try {
      const isOt = OT_TYPES.includes(addType);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          employee_id: addEmpId,
          record_date: addDate,
          record_type: addType,
          hours: isOt ? parseFloat(addHours) || 1 : undefined,
          note: addNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Failed to save"); return;
      }
      toast.success("Record added");
      setShowAdd(false);
      setAddEmpId(""); setAddDate(""); setAddHours("1"); setAddNote("");
      await loadData();
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(r: AttendanceRecord) {
    setEditingId(r.id);
    setEditType(r.record_type);
    setEditHours(String(r.hours ?? 1));
    setEditNote(r.note ?? "");
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    try {
      const isOt = OT_TYPES.includes(editType);
      const res = await fetch(`/api/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: editType,
          hours: isOt ? parseFloat(editHours) || 1 : null,
          note: editNote.trim() || null,
        }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      const updated = await res.json() as AttendanceRecord;
      setRecords((prev) => prev.map((r) => r.id === id ? updated : r));
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
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
      const updated = await res.json() as HrSettings;
      setSettings(updated);
      setSettingsForm(updated);
      setShowSettings(false);
      toast.success("HR settings saved");
    } finally {
      setSettingsSaving(false);
    }
  }

  const totalOtPay = summaries.reduce((s, sm) => s + sm.ot_pay, 0);
  const totalDeduction = summaries.reduce((s, sm) => s + sm.deduction_preview, 0);
  const hasScheduleData = scheduledHours.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track overtime, leaves, and absences · source of truth for payroll</p>
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
          {isOwner && (
            <Button
              variant="ghost" size="sm" className="h-8 w-8 p-0"
              onClick={() => setShowSettings((v) => !v)}
              title="HR Settings"
            >
              <SettingsIcon className="size-4" />
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd((v) => !v)} className="gap-1.5">
            <PlusIcon className="size-4" />
            Add record
          </Button>
        </div>
      </div>

      {/* HR Settings panel (owner only) */}
      {isOwner && showSettings && (
        <form onSubmit={(e) => void saveSettings(e)} className="rounded-lg border border-border bg-card p-5 flex flex-wrap gap-4 items-end">
          <p className="w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide">HR Settings</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Monthly hours divisor</label>
            <input
              type="number" min="1" step="1" value={settingsForm.monthly_hours_divisor}
              onChange={(e) => setSettingsForm((f) => ({ ...f, monthly_hours_divisor: parseFloat(e.target.value) || 208 }))}
              className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Used to compute hourly rate (base ÷ divisor)</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">OT weekday ×</label>
            <input
              type="number" min="1" max="5" step="0.1" value={settingsForm.overtime_weekday_multiplier}
              onChange={(e) => setSettingsForm((f) => ({ ...f, overtime_weekday_multiplier: parseFloat(e.target.value) || 1.5 }))}
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">OT weekend ×</label>
            <input
              type="number" min="1" max="5" step="0.1" value={settingsForm.overtime_weekend_multiplier}
              onChange={(e) => setSettingsForm((f) => ({ ...f, overtime_weekend_multiplier: parseFloat(e.target.value) || 2.0 }))}
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">OT holiday ×</label>
            <input
              type="number" min="1" max="5" step="0.1" value={settingsForm.overtime_holiday_multiplier}
              onChange={(e) => setSettingsForm((f) => ({ ...f, overtime_holiday_multiplier: parseFloat(e.target.value) || 2.0 }))}
              className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex gap-2 items-end">
            <Button type="submit" size="sm" disabled={settingsSaving}>
              {settingsSaving ? "Saving…" : "Save settings"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Add record form */}
      {showAdd && (
        <form onSubmit={(e) => void handleAddRecord(e)} className="rounded-lg border border-border bg-card p-5 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Employee</label>
            <select
              required value={addEmpId} onChange={(e) => setAddEmpId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm min-w-[160px]"
            >
              <option value="">— Select —</option>
              {locationEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <input
              type="date" required value={addDate} onChange={(e) => setAddDate(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <select
              value={addType} onChange={(e) => setAddType(e.target.value as RecordType)}
              className="h-8 rounded-md border border-input bg-background pl-2 pr-7 text-sm min-w-[140px]"
            >
              {ALL_RECORD_TYPES.map((t) => (
                <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {OT_TYPES.includes(addType) && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Hours</label>
              <input
                type="number" min="0.5" max="24" step="0.5" value={addHours}
                onChange={(e) => setAddHours(e.target.value)}
                className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
          )}
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <input
              type="text" value={addNote} onChange={(e) => setAddNote(e.target.value)}
              placeholder="e.g. Late delivery"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={addSaving}>
              {addSaving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin mr-2" />Loading…
        </div>
      ) : (
        <>
          {/* Summary table */}
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40">Employee</th>
                  {hasScheduleData && (
                    <>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Scheduled</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Worked</th>
                    </>
                  )}
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Absence</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Sick</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Unpaid</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Paid</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">OT (wd)</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">OT (we)</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">OT (hol)</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">OT pay</th>
                  {hasScheduleData && (
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground text-xs">Deduction</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {employees.length === 0
                        ? <>No employees yet — <a href="/dashboard/admin/employees" className="underline hover:text-foreground">add your first employee</a>.</>
                        : "No employees assigned to this location. Assign employees in the Employees section."}
                    </td>
                  </tr>
                ) : summaries.map((sm) => (
                  <tr key={sm.employee_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium sticky left-0 bg-card">{sm.employee_name}</td>
                    {hasScheduleData && (
                      <>
                        <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                          {sm.scheduled_hours != null
                            ? <span>{fmtH(sm.scheduled_hours)} <span className="text-muted-foreground/50">({sm.shift_count}d)</span></span>
                            : <span className="text-muted-foreground/40">no schedule</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                          {sm.worked_hours != null ? (
                            <span className={sm.missed_hours > 0 ? "text-amber-600 dark:text-amber-400" : ""}>
                              {fmtH(sm.worked_hours)}
                            </span>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.absence_days > 0 ? <span className="text-destructive">{sm.absence_days}d</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.sick_leave_days > 0 ? <span className="text-amber-600 dark:text-amber-400">{sm.sick_leave_days}d</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.unpaid_leave_days > 0 ? <span className="text-orange-600 dark:text-orange-400">{sm.unpaid_leave_days}d</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.paid_leave_days > 0 ? <span className="text-emerald-700 dark:text-emerald-400">{sm.paid_leave_days}d</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.ot_weekday_hours > 0 ? <span className="text-blue-600 dark:text-blue-400">{fmtH(sm.ot_weekday_hours)}</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.ot_weekend_hours > 0 ? <span className="text-indigo-600 dark:text-indigo-400">{fmtH(sm.ot_weekend_hours)}</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.ot_holiday_hours > 0 ? <span className="text-purple-600 dark:text-purple-400">{fmtH(sm.ot_holiday_hours)}</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums font-medium">
                      {sm.ot_pay > 0 ? <span className="text-blue-600 dark:text-blue-400">{fmtThb(sm.ot_pay)}</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    {hasScheduleData && (
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                        {sm.deduction_preview > 0
                          ? <span className="text-destructive font-medium">{fmtThb(sm.deduction_preview)}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {summaries.length > 0 && (totalOtPay > 0 || totalDeduction > 0) && (
                <tfoot className="border-t-2 border-border bg-muted/20">
                  <tr className="font-semibold">
                    <td className="px-4 py-2.5 text-xs sticky left-0 bg-muted/20">Total</td>
                    {hasScheduleData && <td colSpan={2} />}
                    <td colSpan={7} />
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {totalOtPay > 0 ? fmtThb(totalOtPay) : "—"}
                    </td>
                    {hasScheduleData && (
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-destructive">
                        {totalDeduction > 0 ? fmtThb(totalDeduction) : "—"}
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {!hasScheduleData && summaries.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              No published schedule found for {monthName} — <a href="/dashboard/scheduling" className="underline hover:text-foreground">create a schedule</a> to see scheduled hours and deduction previews.
            </p>
          )}

          {/* Records detail */}
          {records.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">All records — {monthName}</h2>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Date</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Employee</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Type</th>
                      <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Hours</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Note</th>
                      <th className="px-4 py-2.5 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.map((r) => {
                      const emp = employees.find((e) => e.id === r.employee_id);
                      const isEditing = editingId === r.id;
                      return (
                        <tr key={r.id} className={`transition-colors ${isEditing ? "bg-muted/30" : "hover:bg-muted/20"}`}>
                          <td className="px-4 py-2 text-xs tabular-nums">{r.record_date}</td>
                          <td className="px-4 py-2 text-xs">{emp ? `${emp.first_name} ${emp.last_name}` : r.employee_id}</td>
                          <td className="px-4 py-2">
                            {isEditing ? (
                              <select
                                value={editType}
                                onChange={(e) => setEditType(e.target.value as RecordType)}
                                className="h-6 rounded border border-input bg-background pl-1 pr-5 text-xs"
                              >
                                {ALL_RECORD_TYPES.map((t) => (
                                  <option key={t} value={t}>{RECORD_TYPE_LABELS[t]}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${RECORD_TYPE_COLORS[r.record_type]}`}>
                                {RECORD_TYPE_LABELS[r.record_type]}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center text-xs tabular-nums">
                            {isEditing ? (
                              OT_TYPES.includes(editType) ? (
                                <input
                                  type="number" min="0.5" max="24" step="0.5" value={editHours}
                                  onChange={(e) => setEditHours(e.target.value)}
                                  className="h-6 w-16 rounded border border-input bg-background px-1 text-xs text-center"
                                />
                              ) : <span className="text-muted-foreground/40">—</span>
                            ) : (
                              r.hours != null ? `${r.hours}h` : "—"
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {isEditing ? (
                              <input
                                type="text" value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="Note…"
                                className="h-6 w-full rounded border border-input bg-background px-1 text-xs"
                              />
                            ) : (r.note ?? "—")}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                    disabled={editSaving}
                                    onClick={() => void saveEdit(r.id)}
                                  >
                                    {editSaving ? <Loader2Icon className="size-3.5 animate-spin" /> : <CheckIcon className="size-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setEditingId(null)}
                                  >
                                    <XIcon className="size-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => startEdit(r)}
                                  >
                                    <PencilIcon className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                    disabled={deletingId === r.id}
                                    onClick={() => void deleteRecord(r.id)}
                                  >
                                    {deletingId === r.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
