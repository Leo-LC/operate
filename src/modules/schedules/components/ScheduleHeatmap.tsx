"use client";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import type { ShiftGrid } from "@/modules/schedules/types";
import type { Employee } from "@/modules/admin/types";

interface Props {
  grid: ShiftGrid;
  weekDays: string[]; // YYYY-MM-DD[]
  employees: Employee[];
}

// 07:00 to 22:00 in 30-min slots = 30 slots
const SLOT_START = 7 * 2; // 7:00 in half-hours
const SLOT_END = 22 * 2;  // 22:00
const SLOTS = Array.from({ length: SLOT_END - SLOT_START }, (_, i) => {
  const totalHalf = SLOT_START + i;
  const h = Math.floor(totalHalf / 2);
  const m = totalHalf % 2 === 0 ? "00" : "30";
  return { label: `${String(h).padStart(2, "0")}:${m}`, half: totalHalf };
});

function timeToHalf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 2 + (m >= 30 ? 1 : 0);
}

function countAtSlot(grid: ShiftGrid, employees: Employee[], date: string, slot: number): number {
  let count = 0;
  for (const emp of employees) {
    const cell = grid[`${emp.id}__${date}`];
    if (!cell?.start_time || !cell.end_time) continue;
    const start = timeToHalf(cell.start_time);
    const end = timeToHalf(cell.end_time);
    if (slot >= start && slot < end) count++;
  }
  return count;
}

function heatColor(count: number, max: number): string {
  if (count === 0) return "bg-muted/20";
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return "bg-green-200 dark:bg-green-900/40";
  if (ratio < 0.5)  return "bg-green-400 dark:bg-green-700/60";
  if (ratio < 0.75) return "bg-green-600 dark:bg-green-600/80";
  return "bg-green-800 dark:bg-green-500";
}

export function ScheduleHeatmap({ grid, weekDays, employees }: Props) {
  const matrix = useMemo(() => {
    return weekDays.map((date) =>
      SLOTS.map((slot) => countAtSlot(grid, employees, date, slot.half))
    );
  }, [grid, weekDays, employees]);

  const maxCount = useMemo(() => Math.max(...matrix.flat(), 1), [matrix]);

  // Show hour labels every 2 slots (every full hour)
  const hourLabels = SLOTS.filter((s) => s.label.endsWith(":00"));

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">Staffing heatmap</h2>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5 min-w-max">
          {/* Hour axis */}
          <div className="flex gap-0.5 pl-[72px]">
            {SLOTS.map((slot, i) => (
              <div key={i} className="w-4 text-[9px] text-muted-foreground/60 leading-none text-center">
                {slot.label.endsWith(":00") ? slot.label.slice(0, 2) : ""}
              </div>
            ))}
          </div>
          {/* Rows per day */}
          {weekDays.map((date, di) => (
            <div key={date} className="flex items-center gap-0.5">
              <div className="w-[68px] text-xs text-muted-foreground shrink-0 text-right pr-2">
                {format(parseISO(date), "EEE d")}
              </div>
              {SLOTS.map((_, si) => {
                const count = matrix[di][si];
                return (
                  <div
                    key={si}
                    title={count > 0 ? `${count} employee${count !== 1 ? "s" : ""}` : ""}
                    className={`w-4 h-4 rounded-sm ${heatColor(count, maxCount)} transition-colors`}
                  />
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex items-center gap-2 pl-[72px] pt-1">
            <span className="text-[10px] text-muted-foreground">0</span>
            {[0.25, 0.5, 0.75, 1].map((r) => (
              <div key={r} className={`w-4 h-4 rounded-sm ${heatColor(Math.ceil(r * maxCount), maxCount)}`} />
            ))}
            <span className="text-[10px] text-muted-foreground">{maxCount}+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
