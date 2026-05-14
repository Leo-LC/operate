"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
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

const ALL_RECORD_TYPES: RecordType[] = [
  "overtime_weekday", "overtime_weekend", "overtime_holiday",
  "paid_leave", "sick_leave", "unpaid_leave", "public_holiday", "absence",
];

interface Props {
  initialLocations: AdminLocation[];
}

export function AttendanceClient({ initialLocations }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [locationId, setLocationId] = useState(initialLocations[0]?.id ?? "");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<HrSettings>(DEFAULT_HR_SETTINGS);
  const [loading, setLoading] = useState(false);

  // Add record form state
  const [showAdd, setShowAdd] = useState(false);
  const [addEmpId, setAddEmpId] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addType, setAddType] = useState<RecordType>("overtime_weekday");
  const [addHours, setAddHours] = useState("1");
  const [addNote, setAddNote] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en", { month: "long", year: "numeric" });

  const loadData = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const [recRes, empRes, settRes] = await Promise.all([
        fetch(`/api/attendance?month=${monthStr}&location_id=${encodeURIComponent(locationId)}`),
        fetch("/api/admin/employees"),
        fetch("/api/admin/hr-settings"),
      ]);
      const recData = await recRes.json();
      const empData = await empRes.json();
      const settData = await settRes.json();
      setRecords(Array.isArray(recData) ? recData as AttendanceRecord[] : []);
      setEmployees(Array.isArray(empData) ? empData as Employee[] : []);
      setSettings(settData && typeof settData === "object" && !Array.isArray(settData) && !("error" in settData) ? settData as HrSettings : DEFAULT_HR_SETTINGS);
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
    locationEmployees.map((emp) =>
      buildSummary(
        emp.id,
        `${emp.first_name} ${emp.last_name}`,
        emp.base_salary_monthly,
        emp.has_thai_bank_account,
        records.filter((r) => r.employee_id === emp.id),
        settings,
      )
    ),
    [locationEmployees, records, settings]
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

  const totalOtPay = summaries.reduce((s, sm) => s + sm.ot_pay, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track overtime, leaves, and absences</p>
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
          <Button size="sm" onClick={() => setShowAdd((v) => !v)} className="gap-1.5">
            <PlusIcon className="size-4" />
            Add record
          </Button>
        </div>
      </div>

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
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">OT (wd)</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">OT (we)</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">OT (hol)</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Paid</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Sick</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Unpaid</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground text-xs">Absence</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">OT Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {employees.length === 0
                        ? <>No employees yet — <a href="/dashboard/admin/employees" className="underline hover:text-foreground">add your first employee</a> to get started.</>
                        : "No employees assigned to this location. Assign employees in the Employees section."}
                    </td>
                  </tr>
                ) : summaries.map((sm) => (
                  <tr key={sm.employee_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{sm.employee_name}</td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.ot_weekday_hours > 0 ? <span className="text-blue-600 dark:text-blue-400">{sm.ot_weekday_hours}h</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.ot_weekend_hours > 0 ? <span className="text-indigo-600 dark:text-indigo-400">{sm.ot_weekend_hours}h</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.ot_holiday_hours > 0 ? <span className="text-purple-600 dark:text-purple-400">{sm.ot_holiday_hours}h</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.paid_leave_days > 0 ? <span className="text-emerald-700 dark:text-emerald-400">{sm.paid_leave_days}d</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.sick_leave_days > 0 ? <span className="text-amber-600 dark:text-amber-400">{sm.sick_leave_days}d</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.unpaid_leave_days > 0 ? <span className="text-orange-600 dark:text-orange-400">{sm.unpaid_leave_days}d</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs tabular-nums">
                      {sm.absence_days > 0 ? <span className="text-destructive">{sm.absence_days}d</span> : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs font-medium">
                      {sm.ot_pay > 0 ? `฿${Math.round(sm.ot_pay).toLocaleString()}` : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              {summaries.length > 1 && (
                <tfoot className="border-t-2 border-border bg-muted/20">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-semibold" colSpan={8}>Total OT pay</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums">
                      ฿{Math.round(totalOtPay).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Records detail */}
          {records.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-[11px]">All records — {monthName}</h2>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Hours</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Note</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.map((r) => {
                      const emp = employees.find((e) => e.id === r.employee_id);
                      return (
                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2 text-xs tabular-nums">{r.record_date}</td>
                          <td className="px-4 py-2 text-xs">{emp ? `${emp.first_name} ${emp.last_name}` : r.employee_id}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${RECORD_TYPE_COLORS[r.record_type]}`}>
                              {RECORD_TYPE_LABELS[r.record_type]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-xs tabular-nums">
                            {r.hours != null ? `${r.hours}h` : "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{r.note ?? "—"}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                              disabled={deletingId === r.id}
                              onClick={() => void deleteRecord(r.id)}
                            >
                              {deletingId === r.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
                            </button>
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
