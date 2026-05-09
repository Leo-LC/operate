"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaveIcon, CheckIcon, PencilIcon, PrinterIcon, UserPlusIcon, XIcon, CopyIcon } from "lucide-react";
import { ShiftCell, computeShiftHours } from "@/modules/schedules/components/ShiftCell";
import { ScheduleHeatmap } from "@/modules/schedules/components/ScheduleHeatmap";
import type { Schedule, ScheduleShift, ShiftGrid, CellData } from "@/modules/schedules/types";
import { EMPTY_CELL } from "@/modules/schedules/types";
import type { Employee } from "@/modules/admin/types";

const DEFAULT_BREAK_MINUTES = 30;

interface Props {
  schedule: Schedule;
  initialShifts: ScheduleShift[];
  employees: Employee[];
}

function cellKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
}

function toHHMM(t: string | null | undefined): string {
  if (!t) return "";
  return t.length > 5 ? t.substring(0, 5) : t;
}

function buildGrid(shifts: ScheduleShift[]): ShiftGrid {
  const grid: ShiftGrid = {};
  for (const s of shifts) {
    grid[cellKey(s.employee_id, s.shift_date)] = {
      shiftId: s.id,
      start_time: toHHMM(s.start_time),
      end_time: toHHMM(s.end_time),
      break_minutes: s.break_minutes,
      notes: s.notes ?? "",
      dirty: false,
    };
  }
  return grid;
}

export function ScheduleGrid({ schedule, initialShifts, employees }: Props) {
  const router = useRouter();
  const [grid, setGrid] = useState<ShiftGrid>(() => buildGrid(initialShifts));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [localName, setLocalName] = useState(schedule.name);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(schedule.name);
  const [clipboard, setClipboard] = useState<CellData | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef(false);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const employeesRef = useRef(employees);
  employeesRef.current = employees;

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(parseISO(schedule.week_start_date), i);
    return { iso: format(d, "yyyy-MM-dd"), label: format(d, "EEE d") };
  });
  const weekDaysRef = useRef(weekDays);
  weekDaysRef.current = weekDays;

  const getCell = useCallback(
    (empId: string, date: string): CellData => grid[cellKey(empId, date)] ?? { ...EMPTY_CELL },
    [grid],
  );

  function patchCell(empId: string, date: string, patch: Partial<CellData>) {
    setGrid((prev) => ({
      ...prev,
      [cellKey(empId, date)]: { ...(prev[cellKey(empId, date)] ?? EMPTY_CELL), ...patch },
    }));
    scheduleSave();
  }

  function scheduleSave() {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    setSaveState("idle");
    pendingSaveRef.current = true;
    autoSaveRef.current = setTimeout(() => {
      pendingSaveRef.current = false;
      void save();
    }, 800);
  }

  async function save() {
    const currentGrid = gridRef.current;
    const shifts = employeesRef.current.flatMap((emp) =>
      weekDaysRef.current
        .map((day) => {
          const cell = currentGrid[cellKey(emp.id, day.iso)] ?? EMPTY_CELL;
          return {
            employee_id: emp.id,
            shift_date: day.iso,
            start_time: cell.start_time || null,
            end_time: cell.end_time || null,
            break_minutes: DEFAULT_BREAK_MINUTES,
            notes: cell.notes || null,
          };
        })
        .filter((s) => s.start_time !== null),
    );

    setSaveState("saving");
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to save");
        setSaveState("idle");
        return;
      }
      setSaveState("saved");
      // Auto-publish draft on first save
      if (schedule.status === "draft") {
        await fetch(`/api/schedules/${schedule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        });
      }
    } catch {
      toast.error("Network error while saving");
      setSaveState("idle");
    }
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    setEditingName(false);
    if (!trimmed || trimmed === localName) return;
    setLocalName(trimmed);
    const res = await fetch(`/api/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      toast.error("Failed to rename schedule");
      setLocalName(schedule.name);
    }
  }

  function printSchedule() {
    const win = window.open("", "_blank", "width=1100,height=750");
    if (!win) { toast.error("Pop-up blocked — please allow pop-ups and try again"); return; }

    const weekRange = `${format(parseISO(schedule.week_start_date), "d MMM")} – ${format(addDays(parseISO(schedule.week_start_date), 6), "d MMM yyyy")}`;
    const headers = weekDaysRef.current.map((d) => `<th>${d.label}</th>`).join("");
    const rows = employeesRef.current.map((emp, rowIdx) => {
      let total = 0;
      const cells = weekDaysRef.current.map((day) => {
        const cell = gridRef.current[cellKey(emp.id, day.iso)] ?? EMPTY_CELL;
        if (!cell.start_time) return `<td class="off">—</td>`;
        const h = computeShiftHours(cell.start_time, cell.end_time, DEFAULT_BREAK_MINUTES);
        total += h;
        return `<td class="shift"><span class="time">${cell.start_time} – ${cell.end_time}</span><span class="hrs">${h.toFixed(1)}h</span></td>`;
      }).join("");
      const rowClass = rowIdx % 2 === 0 ? "" : ' class="alt"';
      return `<tr${rowClass}>
        <td class="name">${emp.first_name} ${emp.last_name}${emp.position ? `<br><small>${emp.position}</small>` : ""}</td>
        ${cells}
        <td class="total">${total.toFixed(1)}h</td>
      </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${localName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:11px;color:#1a1a1a;background:#fff}
  .accent{height:5px;background:#1e3a8a;width:100%}
  .header{padding:16px 24px 12px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e5e7eb}
  .header-left h1{font-size:16px;font-weight:700;color:#111;margin-bottom:3px}
  .header-left .meta{font-size:11px;color:#6b7280}
  .header-right{text-align:right;font-size:10px;color:#9ca3af}
  .content{padding:16px 24px}
  table{border-collapse:collapse;width:100%;table-layout:fixed}
  col.name-col{width:140px}
  col.day-col{width:auto}
  col.total-col{width:64px}
  th{background:#1e3a8a;color:#fff;font-weight:600;font-size:10px;padding:7px 8px;text-align:center;letter-spacing:0.3px}
  th.name-th{text-align:left;padding-left:10px}
  td{padding:6px 8px;text-align:center;vertical-align:middle;border-bottom:1px solid #f0f0f0;font-size:10.5px}
  tr.alt td{background:#f8fafc}
  td.name{text-align:left;font-weight:600;padding-left:10px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  td.name small{color:#9ca3af;font-size:9px;display:block;font-weight:400}
  td.off{color:#d1d5db;font-size:13px}
  td.shift{line-height:1}
  td.shift .time{display:block;color:#374151;font-weight:500}
  td.shift .hrs{display:block;color:#16a34a;font-weight:700;font-size:10px;margin-top:2px}
  td.total{font-weight:700;color:#1e3a8a;background:#eff6ff!important;border-left:2px solid #bfdbfe}
  @media print{@page{margin:8mm;size:landscape}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.accent{-webkit-print-color-adjust:exact}}
</style></head><body>
<div class="accent"></div>
<div class="header">
  <div class="header-left">
    <h1>${localName}</h1>
    <div class="meta">${schedule.location_name ? `${schedule.location_name} &nbsp;·&nbsp; ` : ""}${weekRange}</div>
  </div>
  <div class="header-right">Capybara Coffee<br>Internal Schedule</div>
</div>
<div class="content">
<table>
  <colgroup><col class="name-col">${weekDaysRef.current.map(() => '<col class="day-col">').join("")}<col class="total-col"></colgroup>
  <thead><tr><th class="name-th">Employee</th>${headers}<th>Week</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    win.document.close();
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${localName} (copy)` }),
      });
      if (!res.ok) { toast.error("Failed to duplicate schedule"); return; }
      const duped = (await res.json()) as { id: string };
      toast.success("Schedule duplicated");
      router.push(`/dashboard/scheduling/${duped.id}`);
    } finally {
      setDuplicating(false);
    }
  }

  useEffect(() => {
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      if (pendingSaveRef.current) void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex flex-col gap-1">
          {/* Editable title */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                  if (e.key === "Escape") { setEditingName(false); setNameInput(localName); }
                }}
                className="text-xl font-semibold bg-transparent border-b border-ring outline-none w-64"
              />
              <button
                type="button"
                onClick={() => { setEditingName(false); setNameInput(localName); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setNameInput(localName); setEditingName(true); }}
              className="group flex items-center gap-1.5 text-left"
              title="Click to rename"
            >
              <h1 className="text-xl font-semibold">{localName}</h1>
              <PencilIcon className="size-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {schedule.location_name && <span>{schedule.location_name}</span>}
            {schedule.location_name && <span className="text-muted-foreground/40">·</span>}
            <span>
              {format(parseISO(schedule.week_start_date), "d MMM")}
              {" – "}
              {format(addDays(parseISO(schedule.week_start_date), 6), "d MMM yyyy")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleDuplicate()}
            disabled={duplicating}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            title="Duplicate this schedule"
          >
            <CopyIcon className="size-4" />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={printSchedule}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            title="Download as PDF"
          >
            <PrinterIcon className="size-4" />
            PDF
          </Button>
          <a
            href={`/dashboard/scheduling/employees?location_id=${schedule.location_id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <UserPlusIcon className="size-4" />
            Manage employees
          </a>
          {saveState === "saved" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-green-600 dark:text-green-400 font-medium rounded-md bg-green-500/8 dark:bg-green-400/8 border border-green-500/20 dark:border-green-400/20">
              <CheckIcon className="size-4" />
              Saved
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void save()}
              disabled={saveState === "saving"}
              className="gap-1.5"
            >
              <SaveIcon className="size-4" />
              {saveState === "saving" ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </div>

      {/* ── No employees state ──────────────────────────────────── */}
      {employees.length === 0 && (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center space-y-3">
          <p className="font-medium text-foreground text-sm">No employees assigned to this shop yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Browse all organisation employees or create a new one with full details including salary, nationality, and work permit.
          </p>
          <a
            href={`/dashboard/scheduling/employees?location_id=${schedule.location_id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <UserPlusIcon className="size-4" />
            Manage employees for this shop
          </a>
        </div>
      )}

      {/* ── Schedule table ──────────────────────────────────────── */}
      {employees.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead className="bg-muted/50 border-b-2 border-border">
              <tr>
                <th className="w-40 px-3 py-3 text-left text-xs font-semibold text-foreground/60 border-r border-border" />
                {weekDays.map((d) => {
                  const [dayName, dayNum] = d.label.split(" ");
                  return (
                    <th key={d.iso} className="py-2.5 px-1 text-center border-l border-border/60">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">{dayName}</div>
                      <div className="text-sm font-semibold text-foreground/90 leading-tight">{dayNum}</div>
                    </th>
                  );
                })}
                <th className="w-20 py-2.5 px-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 border-l border-border/60">
                  Week
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                let weeklyHours = 0;
                return (
                  <tr key={emp.id} className="group odd:bg-background even:bg-muted/15 hover:bg-accent/20 transition-colors border-b border-border/40 last:border-b-0">
                    <td className="w-40 px-3 py-2.5 border-r border-border sticky left-0 bg-inherit">
                      <div className="truncate font-semibold text-xs leading-tight text-foreground">
                        {emp.first_name} {emp.last_name}
                      </div>
                      {emp.position && (
                        <div className="truncate text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
                          {emp.position}
                        </div>
                      )}
                    </td>
                    {weekDays.map((day) => {
                      const cell = getCell(emp.id, day.iso);
                      const hours = computeShiftHours(cell.start_time, cell.end_time, DEFAULT_BREAK_MINUTES);
                      weeklyHours += hours;
                      return (
                        <td key={day.iso} className="px-1.5 py-1.5 align-top border-l border-border/50">
                          <ShiftCell
                            data={cell}
                            hours={hours}
                            onChange={(patch) => patchCell(emp.id, day.iso, patch)}
                            onCopy={() => setClipboard({ ...cell })}
                            onPaste={() => {
                              if (clipboard) patchCell(emp.id, day.iso, { ...clipboard, shiftId: cell.shiftId, dirty: true });
                            }}
                            onClear={() => patchCell(emp.id, day.iso, { ...EMPTY_CELL, shiftId: cell.shiftId, dirty: true })}
                            hasCopied={clipboard !== null}
                            onDragStart={() => setDragSource(cellKey(emp.id, day.iso))}
                            onDrop={() => {
                              if (dragSource && dragSource !== cellKey(emp.id, day.iso)) {
                                const src = gridRef.current[dragSource] ?? EMPTY_CELL;
                                patchCell(emp.id, day.iso, { ...src, shiftId: cell.shiftId, dirty: true });
                              }
                              setDragSource(null);
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="w-20 px-1.5 py-1.5 text-center align-middle border-l border-border/50">
                      <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${weeklyHours > 0 ? "bg-muted/70 text-foreground" : "text-muted-foreground/40"}`}>
                        {weeklyHours > 0 ? `${weeklyHours.toFixed(1)}h` : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Heatmap ─────────────────────────────────────────────── */}
      {employees.length > 0 && (
        <ScheduleHeatmap grid={grid} weekDays={weekDays.map((d) => d.iso)} employees={employees} />
      )}
    </div>
  );
}
