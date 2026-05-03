"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaveIcon, CheckIcon } from "lucide-react";
import { ShiftCell } from "@/modules/schedules/components/ShiftCell";
import { ScheduleHeatmap } from "@/modules/schedules/components/ScheduleHeatmap";
import type { Schedule, ScheduleShift, ShiftGrid, CellData } from "@/modules/schedules/types";
import { EMPTY_CELL, STATUS_LABELS, STATUS_CLASSES } from "@/modules/schedules/types";
import type { Employee } from "@/modules/admin/types";

interface Props {
  schedule: Schedule;
  initialShifts: ScheduleShift[];
  employees: Employee[];
}

function cellKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
}

function buildGrid(shifts: ScheduleShift[]): ShiftGrid {
  const grid: ShiftGrid = {};
  for (const s of shifts) {
    grid[cellKey(s.employee_id, s.shift_date)] = {
      shiftId: s.id,
      start_time: s.start_time ?? "",
      end_time: s.end_time ?? "",
      break_minutes: s.break_minutes,
      notes: s.notes ?? "",
      dirty: false,
    };
  }
  return grid;
}

export function ScheduleGrid({ schedule, initialShifts, employees }: Props) {
  const [grid, setGrid] = useState<ShiftGrid>(() => buildGrid(initialShifts));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [clipboard, setClipboard] = useState<CellData | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(parseISO(schedule.week_start_date), i);
    return { iso: format(d, "yyyy-MM-dd"), label: format(d, "EEE d") };
  });

  const getCell = useCallback((empId: string, date: string): CellData =>
    grid[cellKey(empId, date)] ?? { ...EMPTY_CELL }, [grid]);

  function patchCell(empId: string, date: string, patch: Partial<CellData>) {
    const key = cellKey(empId, date);
    setGrid((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? EMPTY_CELL), ...patch },
    }));
    scheduleSave();
  }

  function scheduleSave() {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    setSaveState("idle");
    autoSaveRef.current = setTimeout(() => void save(), 1500);
  }

  async function save() {
    const currentGrid = gridRef.current;
    const shifts = employees.flatMap((emp) =>
      weekDays.map((day) => {
        const cell = currentGrid[cellKey(emp.id, day.iso)] ?? EMPTY_CELL;
        return {
          employee_id: emp.id,
          shift_date: day.iso,
          start_time: cell.start_time || null,
          end_time: cell.end_time || null,
          break_minutes: cell.break_minutes,
          notes: cell.notes || null,
        };
      })
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
    } catch {
      toast.error("Network error while saving");
      setSaveState("idle");
    }
  }

  useEffect(() => {
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{schedule.name}</h1>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[schedule.status]}`}>
            {STATUS_LABELS[schedule.status]}
          </span>
          {schedule.location_name && (
            <span className="text-sm text-muted-foreground">{schedule.location_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void save()}
            disabled={saveState === "saving"}
            className="gap-1.5"
          >
            {saveState === "saved" ? <CheckIcon className="size-4 text-green-600" /> : <SaveIcon className="size-4" />}
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {employees.length === 0 && (
        <div className="rounded-lg border border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No employees assigned to this shop yet. Add employees in Admin → Employees first.
        </div>
      )}

      {employees.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[120px] sticky left-0 bg-muted/40">
                  Employee
                </th>
                {weekDays.map((d) => (
                  <th key={d.iso} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[120px]">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-muted/10">
                  <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-background group-hover:bg-muted/10 border-r border-border">
                    {emp.first_name} {emp.last_name}
                    {emp.position && (
                      <div className="text-xs text-muted-foreground">{emp.position}</div>
                    )}
                  </td>
                  {weekDays.map((day) => {
                    const key = cellKey(emp.id, day.iso);
                    const cell = getCell(emp.id, day.iso);
                    return (
                      <td key={day.iso} className="px-1 py-1 align-top">
                        <ShiftCell
                          data={cell}
                          onChange={(patch) => patchCell(emp.id, day.iso, patch)}
                          onCopy={() => setClipboard({ ...cell })}
                          onPaste={() => {
                            if (clipboard) patchCell(emp.id, day.iso, { ...clipboard, shiftId: cell.shiftId, dirty: true });
                          }}
                          onClear={() => patchCell(emp.id, day.iso, { ...EMPTY_CELL, shiftId: cell.shiftId, dirty: true })}
                          hasCopied={clipboard !== null}
                          onDragStart={() => setDragSource(key)}
                          onDrop={() => {
                            if (dragSource && dragSource !== key) {
                              const sourceCell = gridRef.current[dragSource] ?? EMPTY_CELL;
                              patchCell(emp.id, day.iso, { ...sourceCell, shiftId: cell.shiftId, dirty: true });
                            }
                            setDragSource(null);
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap */}
      {employees.length > 0 && (
        <ScheduleHeatmap grid={grid} weekDays={weekDays.map((d) => d.iso)} employees={employees} />
      )}
    </div>
  );
}
