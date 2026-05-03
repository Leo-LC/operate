"use client";

import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { computeShiftHours } from "@/lib/scheduling/schedule-math";

type ShiftInput = {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutesOverride: number | null;
};

type ShiftPresetId = "OFF" | "OPENING" | "OPENING_CASHIER" | "MORNING" | "DAYTIME" | "CLOSING" | "CUSTOM";
type CellValue = { preset: ShiftPresetId; start: string; end: string };

const SHIFT_PRESETS: Record<ShiftPresetId, { label: string; start?: string; end?: string }> = {
  OFF: { label: "OFF" },
  OPENING: { label: "Opening (07:00-16:00)", start: "07:00", end: "16:00" },
  OPENING_CASHIER: { label: "Opening Cashier (07:30-16:30)", start: "07:30", end: "16:30" },
  MORNING: { label: "Morning (09:00-18:00)", start: "09:00", end: "18:00" },
  DAYTIME: { label: "Daytime (11:00-20:00)", start: "11:00", end: "20:00" },
  CLOSING: { label: "Closing (12:30-21:30)", start: "12:30", end: "21:30" },
  CUSTOM: { label: "Custom..." },
};

const TIME_OPTIONS = Array.from({ length: (21 - 7 + 1) * 2 }).map((_, i) => {
  const h = 7 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const inferPreset = (start: string, end: string): ShiftPresetId => {
  for (const [id, preset] of Object.entries(SHIFT_PRESETS)) {
    if (preset.start === start && preset.end === end) return id as ShiftPresetId;
  }
  return "CUSTOM";
};

const weekLabel = (startIso: string) => {
  const start = parseISO(startIso);
  const end = addDays(start, 6);
  return `${format(start, "dd")} to ${format(end, "dd MMMM")}`;
};

const shiftColorClass = (start: string, preset: ShiftPresetId) => {
  if (preset === "OFF") return "bg-muted/40";
  if (start === "07:00" || start === "07:30") return "bg-[color-mix(in_oklab,var(--chart-2)_30%,transparent)]";
  if (start === "09:00") return "bg-[color-mix(in_oklab,var(--amber)_35%,transparent)]";
  if (start === "12:30") return "bg-[color-mix(in_oklab,var(--destructive)_30%,transparent)]";
  return "bg-[color-mix(in_oklab,var(--success)_30%,transparent)]";
};

export default function SchedulesPage() {
  const search = useSearchParams();
  const branchId = search.get("branch") ?? "";
  const [employees, setEmployees] = useState<{ id: string; fullName: string }[]>([]);
  const [weekStartDate, setWeekStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [breakMinutesDefault, setBreakMinutesDefault] = useState(30);
  const [grid, setGrid] = useState<Record<string, CellValue>>({});
  const [allSchedules, setAllSchedules] = useState<{ id: string; status: "active" | "archived"; weekStartDate: string; shifts: ShiftInput[] }[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editedAt, setEditedAt] = useState<Date | null>(null);
  const dirtyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTokenRef = useRef(0);
  const gridRef = useRef(grid);
  const employeesRef = useRef(employees);
  const weekDaysRef = useRef<{ iso: string; label: string }[]>([]);
  const branchIdRef = useRef(branchId);
  const weekStartDateRef = useRef(weekStartDate);
  const breakMinutesDefaultRef = useRef(breakMinutesDefault);
  const selectedScheduleIdRef = useRef(selectedScheduleId);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(parseISO(weekStartDate), i);
      return { iso: format(d, "yyyy-MM-dd"), label: format(d, "EEE d MMM") };
    }),
    [weekStartDate],
  );
  const keyOf = (employeeId: string, dateIso: string) => `${employeeId}__${dateIso}`;

  useEffect(() => {
    if (!branchId) return;
    const load = async () => {
      const [eRes, sRes] = await Promise.all([
        fetch(`/api/scheduling/employees?branchId=${encodeURIComponent(branchId)}`),
        fetch(`/api/scheduling/schedules?branchId=${encodeURIComponent(branchId)}`),
      ]);
      const eData = await eRes.json();
      const sData = await sRes.json();
      setEmployees(eData.employees ?? []);
      setAllSchedules(sData.schedules ?? []);
    };
    void load();
  }, [branchId]);

  const schedulesForWeek = useMemo(() => allSchedules.filter((s) => s.weekStartDate === weekStartDate), [allSchedules, weekStartDate]);

  useEffect(() => {
    const selected =
      (selectedScheduleId
        ? allSchedules.find(
            (s) => s.id === selectedScheduleId && s.weekStartDate === weekStartDate,
          )
        : null) ?? schedulesForWeek.find((s) => s.status === "active");
    const next: Record<string, CellValue> = {};
    for (const employee of employees) {
      for (const day of weekDays) next[keyOf(employee.id, day.iso)] = { preset: "OFF", start: "09:00", end: "18:00" };
    }
    if (selected) {
      for (const shift of selected.shifts) {
        next[keyOf(shift.employeeId, shift.date)] = { preset: inferPreset(shift.startTime, shift.endTime), start: shift.startTime, end: shift.endTime };
      }
      setSelectedScheduleId(selected.id);
    }
    setGrid(next);
  }, [allSchedules, employees, schedulesForWeek, selectedScheduleId, weekDays, weekStartDate]);

  const setCell = (employeeId: string, dateIso: string, patch: Partial<CellValue>) => {
    setGrid((prev) => {
      const key = keyOf(employeeId, dateIso);
      const current = prev[key] ?? { preset: "OFF", start: "09:00", end: "18:00" };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  };

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  useEffect(() => {
    weekDaysRef.current = weekDays;
  }, [weekDays]);

  useEffect(() => {
    branchIdRef.current = branchId;
  }, [branchId]);

  useEffect(() => {
    weekStartDateRef.current = weekStartDate;
  }, [weekStartDate]);

  useEffect(() => {
    breakMinutesDefaultRef.current = breakMinutesDefault;
  }, [breakMinutesDefault]);

  useEffect(() => {
    selectedScheduleIdRef.current = selectedScheduleId;
  }, [selectedScheduleId]);

  const saveSchedule = async (token: number) => {
    const liveGrid = gridRef.current;
    const liveEmployees = employeesRef.current;
    const liveWeekDays = weekDaysRef.current;
    const liveBranchId = branchIdRef.current;
    const liveWeekStartDate = weekStartDateRef.current;
    const liveBreakMinutesDefault = breakMinutesDefaultRef.current;
    const liveSelectedScheduleId = selectedScheduleIdRef.current;
    const shifts: ShiftInput[] = [];
    for (const employee of liveEmployees) {
      for (const day of liveWeekDays) {
        const cell = liveGrid[keyOf(employee.id, day.iso)];
        if (!cell || cell.preset === "OFF" || !cell.start || !cell.end || !(cell.end > cell.start)) continue;
        shifts.push({ employeeId: employee.id, date: day.iso, startTime: cell.start, endTime: cell.end, breakMinutesOverride: null });
      }
    }
    const response = await fetch("/api/scheduling/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: liveBranchId,
        weekStartDate: liveWeekStartDate,
        breakMinutesDefault: liveBreakMinutesDefault,
        shifts,
      }),
    });
    if (!response.ok) throw new Error("Failed to save schedule");
    if (token !== saveTokenRef.current) return;
    const data = (await response.json()) as { scheduleId?: string };
    const effectiveId = liveSelectedScheduleId ?? data.scheduleId ?? `${liveBranchId}-${liveWeekStartDate}`;

    setSelectedScheduleId(effectiveId);
    setAllSchedules((prev) => {
      if (token !== saveTokenRef.current) return prev;
      const nextActive = {
        id: effectiveId,
        status: "active" as const,
        weekStartDate: liveWeekStartDate,
        shifts,
      };
      const kept = prev.filter(
        (s) =>
          s.id !== effectiveId &&
          !(s.weekStartDate === liveWeekStartDate && s.status === "active"),
      );
      return [nextActive, ...kept];
    });
  };

  const queueAutoSave = () => {
    dirtyRef.current = true;
    setSaveState("saving");
    setEditedAt(new Date());
    const token = ++saveTokenRef.current;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await saveSchedule(token);
        if (token !== saveTokenRef.current) return;
        setSaveState("saved");
      } catch {
        if (token !== saveTokenRef.current) return;
        setSaveState("error");
      }
    }, 900);
  };

  const saveNow = async () => {
    const token = ++saveTokenRef.current;
    setSaveState("saving");
    try {
      await saveSchedule(token);
      if (token !== saveTokenRef.current) return;
      setEditedAt(new Date());
      setSaveState("saved");
    } catch {
      if (token !== saveTokenRef.current) return;
      setSaveState("error");
    }
  };

  const onArchiveSchedule = async (scheduleId: string) => {
    await fetch("/api/scheduling/schedules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    });
    const res = await fetch(`/api/scheduling/schedules?branchId=${encodeURIComponent(branchId)}`);
    const data = await res.json();
    setAllSchedules(data.schedules ?? []);
  };

  useEffect(() => () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

  const heatmap = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    for (const day of weekDays) {
      byDate[day.iso] = {};
      for (const slot of TIME_OPTIONS) byDate[day.iso][slot] = 0;
    }
    for (const employee of employees) {
      for (const day of weekDays) {
        const cell = grid[keyOf(employee.id, day.iso)];
        if (!cell || cell.preset === "OFF") continue;
        for (const slot of TIME_OPTIONS) if (slot >= cell.start && slot < cell.end) byDate[day.iso][slot] += 1;
      }
    }
    return byDate;
  }, [employees, grid, weekDays]);

  const completion = useMemo(() => {
    const total = employees.length * weekDays.length;
    if (total === 0) return 0;
    let filled = 0;
    for (const employee of employees) {
      for (const day of weekDays) {
        const cell = grid[keyOf(employee.id, day.iso)];
        if (cell && cell.preset !== "OFF" && cell.end > cell.start) filled += 1;
      }
    }
    return Math.round((filled / total) * 100);
  }, [employees, grid, weekDays]);

  const heatmapMax = useMemo(() => {
    let max = 0;
    for (const day of weekDays) {
      for (const slot of TIME_OPTIONS) {
        const count = heatmap[day.iso]?.[slot] ?? 0;
        if (count > max) max = count;
      }
    }
    return max;
  }, [heatmap, weekDays]);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5 text-card-foreground">
      <div>
        <h1 className="text-xl font-semibold">Weekly Schedules</h1>
        <p className="text-sm text-muted-foreground">Visual weekly grid by employee and day.</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Coverage: {completion}% filled</span>
          <span>•</span>
          <span>
            {saveState === "saving" && "Saving..."}
            {saveState === "saved" && `Saved${editedAt ? ` at ${format(editedAt, "HH:mm:ss")}` : ""}`}
            {saveState === "error" && "Save failed"}
            {saveState === "idle" && "Ready"}
          </span>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[1.2fr_0.8fr_0.7fr]">
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Week</label>
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-muted/60" onClick={() => setWeekStartDate(format(addDays(parseISO(weekStartDate), -7), "yyyy-MM-dd"))}>Prev</button>
            <div className="text-sm font-medium">{weekLabel(weekStartDate)}</div>
            <button type="button" className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-muted/60" onClick={() => setWeekStartDate(format(addDays(parseISO(weekStartDate), 7), "yyyy-MM-dd"))}>Next</button>
          </div>
        </div>
        <div className="max-w-[170px] rounded-md border border-border bg-background px-2 py-1">
          <label className="mb-0.5 block text-[11px] uppercase tracking-wide text-muted-foreground">Default break (min)</label>
          <input
            type="number"
            className="w-full rounded-md border border-input bg-background px-2 py-0.5 text-xs"
            value={breakMinutesDefault}
            onChange={(e) => {
              setBreakMinutesDefault(Number(e.target.value));
              queueAutoSave();
            }}
          />
        </div>
        <div className="max-w-[150px] rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground">
          Autosave 0.9s
        </div>
        <button
          type="button"
          className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-muted/60"
          onClick={() => void saveNow()}
        >
          Save now
        </button>
      </div>

      <div className="-mx-1 overflow-x-auto rounded-md border border-border md:mx-0">
        <table className="min-w-[1080px] w-full table-fixed text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="sticky left-0 z-10 w-36 border-b border-border bg-muted/40 px-2 py-2 text-left text-muted-foreground">Employee</th>
              {weekDays.map((d) => (
                <th key={d.iso} className="border-b border-border px-1 py-2 text-muted-foreground">{d.label}</th>
              ))}
              <th className="w-20 border-b border-border px-2 py-2 text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              let weeklyTotal = 0;
              return (
                <tr key={employee.id} className="align-top">
                  <td className="sticky left-0 border-b border-border bg-card px-2 py-2 font-medium">{employee.fullName}</td>
                  {weekDays.map((d) => {
                    const cell = grid[keyOf(employee.id, d.iso)] ?? { preset: "OFF" as ShiftPresetId, start: "09:00", end: "18:00" };
                    const hours = cell.preset === "OFF" ? 0 : computeShiftHours(cell.start, cell.end, breakMinutesDefault);
                    weeklyTotal += hours;
                    return (
                      <td key={d.iso} className={`border-b border-border px-1 py-1 ${shiftColorClass(cell.start, cell.preset)}`}>
                        <div className="space-y-1">
                          <select
                            value={cell.preset}
                            onChange={(e) => {
                              const preset = e.target.value as ShiftPresetId;
                              const p = SHIFT_PRESETS[preset];
                              if (preset === "CUSTOM") {
                                setCell(employee.id, d.iso, { preset });
                                return;
                              }
                              if (preset === "OFF") {
                                setCell(employee.id, d.iso, { preset, start: "09:00", end: "18:00" });
                                return queueAutoSave();
                              }
                              setCell(employee.id, d.iso, { preset, start: p.start!, end: p.end! });
                              queueAutoSave();
                            }}
                            className="w-full rounded border border-input bg-background px-1 py-1 text-[11px]"
                          >
                            {Object.entries(SHIFT_PRESETS).map(([id, p]) => (
                              <option key={id} value={id}>{p.label}</option>
                            ))}
                          </select>
                          {cell.preset === "CUSTOM" && (
                            <div className="flex items-center gap-1">
                              <select
                                className="w-full rounded border border-input bg-background px-1 py-1 text-[11px]"
                                value={cell.start}
                                onChange={(e) => {
                                  setCell(employee.id, d.iso, { start: e.target.value });
                                  queueAutoSave();
                                }}
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <select
                                className="w-full rounded border border-input bg-background px-1 py-1 text-[11px]"
                                value={cell.end}
                                onChange={(e) => {
                                  setCell(employee.id, d.iso, { end: e.target.value });
                                  queueAutoSave();
                                }}
                              >
                                {TIME_OPTIONS.filter((t) => t > cell.start).map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div
                            className={`inline-flex items-center rounded-full border border-border bg-background/80 px-1.5 py-0.5 text-[10px] font-medium ${
                              cell.preset === "OFF" ? "invisible" : "text-foreground"
                            }`}
                          >
                            <span className={cell.preset === "OFF" ? "opacity-0" : "opacity-100"}>
                              {cell.start} - {cell.end}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{hours.toFixed(2)}h</p>
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-border px-2 py-2 font-semibold">{weeklyTotal.toFixed(2)}h</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-border bg-background p-3">
        <p className="mb-2 text-sm font-medium">Coverage heatmap (every 30 minutes)</p>
        <div className="hidden overflow-x-auto rounded-md border border-border md:block">
          <table className="min-w-[920px] w-full table-fixed text-[10px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="w-24 border-b border-border px-1 py-1.5 text-left text-muted-foreground">Day</th>
                {TIME_OPTIONS.map((slot) => (
                  <th key={slot} className="border-b border-border px-1 py-1.5 text-muted-foreground">{slot}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDays.map((d) => (
                <tr key={d.iso}>
                  <td className="border-b border-border px-1 py-1 text-muted-foreground">{d.label}</td>
                  {TIME_OPTIONS.map((slot) => {
                    const count = heatmap[d.iso]?.[slot] ?? 0;
                    const ratio = heatmapMax <= 0 ? 0 : count / heatmapMax;
                    const tone = Math.round(12 + ratio * 63);
                    return (
                      <td key={`${d.iso}-${slot}`} className="border-b border-border px-1 py-1 text-center">
                        <div
                          className="mx-auto h-4 w-4 rounded-[3px] border border-border/40"
                          style={{
                            backgroundColor:
                              count <= 0
                                ? "color-mix(in oklab, var(--muted) 28%, transparent)"
                                : `color-mix(in oklab, var(--success) ${tone}%, transparent)`,
                          }}
                          title={`${d.label} ${slot}: ${count}`}
                        />
                        <div className="mt-0.5 text-[9px] leading-none text-muted-foreground">
                          {count > 0 ? count : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-border bg-background p-3">
        <p className="mb-2 text-sm font-medium">Schedule history</p>
        {allSchedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved weeks yet for this location.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {allSchedules.map((schedule) => (
              <div
                key={schedule.id}
                onClick={() => {
                  if (schedule.weekStartDate) setWeekStartDate(schedule.weekStartDate);
                  setSelectedScheduleId(schedule.id);
                }}
                className={`flex items-center justify-between rounded-md border p-2 text-left text-sm ${
                  selectedScheduleId === schedule.id ? "border-border bg-secondary text-secondary-foreground" : "border-border hover:bg-muted/60"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{weekLabel(schedule.weekStartDate ?? weekStartDate)}</span>
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase">{schedule.status}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(((schedule.shifts?.length ?? 0) / Math.max(1, employees.length * weekDays.length)) * 100)}% filled
                  </span>
                </span>
                {schedule.status === "active" && (
                  <button type="button" className="rounded border border-input bg-background px-2 py-0.5 text-[11px] hover:bg-muted/60" onClick={(e) => { e.stopPropagation(); void onArchiveSchedule(schedule.id); }}>
                    Archive
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
