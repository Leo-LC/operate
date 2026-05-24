"use client";
import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import type { ShiftGrid } from "@/modules/schedules/types";
import type { Employee } from "@/modules/admin/types";

interface Props {
  grid: ShiftGrid;
  weekDays: string[]; // YYYY-MM-DD[]
  employees: Employee[];
}

// 07:00 to 22:00 → 30 half-hour slots (15 full hours)
// Starting and ending on a full hour makes each hour label align over exactly 2 cells.
const SLOT_START = 14; // 07:00 = 7 × 2
const SLOT_END   = 44; // 22:00 = 22 × 2

const SLOTS = Array.from({ length: SLOT_END - SLOT_START }, (_, i) => {
  const half = SLOT_START + i;
  const h = Math.floor(half / 2);
  const m = half % 2 === 0 ? "00" : "30";
  return { label: `${String(h).padStart(2, "0")}:${m}`, half };
});

// One label per full hour, each spanning 2 slot columns.
const HOUR_LABELS = Array.from(
  { length: (SLOT_END - SLOT_START) / 2 },
  (_, i) => String(SLOT_START / 2 + i).padStart(2, "0"),
);

const CELL = 20;          // px: cell width & height
const GAP  = 4;           // px: gap between cells
const DAY_LABEL_W = 72;   // px: fixed width of the day-label column

const GRID_COLS = `repeat(${SLOTS.length}, ${CELL}px)`;

function timeToHalf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 2 + (m >= 30 ? 1 : 0);
}

function countAtSlot(
  grid: ShiftGrid,
  employees: Employee[],
  date: string,
  slot: number,
): number {
  let n = 0;
  for (const emp of employees) {
    const cell = grid[`${emp.id}__${date}`];
    if (!cell?.start_time || !cell.end_time) continue;
    if (slot >= timeToHalf(cell.start_time) && slot < timeToHalf(cell.end_time)) n++;
  }
  return n;
}

const CELL_BORDER: React.CSSProperties = {
  border: "1px solid var(--line)",
  boxSizing: "border-box",
};

function cellStyle(count: number): React.CSSProperties {
  if (count === 0) return { backgroundColor: "var(--bg-2)", color: "transparent", ...CELL_BORDER };
  if (count === 1) return { backgroundColor: "var(--bronze-soft)", color: "var(--bronze)", ...CELL_BORDER };
  if (count === 2) return { backgroundColor: "var(--info-soft)", color: "var(--info)", ...CELL_BORDER };
  if (count === 3) return { backgroundColor: "var(--info)", color: "var(--surface)", ...CELL_BORDER };
  return               { backgroundColor: "var(--bronze)", color: "var(--surface)", ...CELL_BORDER };
}

const DAY_LABEL_STYLE: React.CSSProperties = {
  width: DAY_LABEL_W,
  flexShrink: 0,
  textAlign: "right",
  paddingRight: 10,
  fontSize: 11,
  fontWeight: 500,
  color: "var(--fg-4)",
  whiteSpace: "nowrap",
  userSelect: "none",
};

export function ScheduleHeatmap({ grid, weekDays, employees }: Props) {
  const matrix = useMemo(
    () => weekDays.map((date) => SLOTS.map((s) => countAtSlot(grid, employees, date, s.half))),
    [grid, weekDays, employees],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", margin: 0 }}>Staffing coverage</h2>
        <p style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 2 }}>30-minute coverage by day</p>
      </div>

      <div style={{ overflowX: "auto", borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 16 }}>

        {/* ── Time label header ─────────────────────────────────────
            One label per full hour, left-aligned to the :00 cell's edge
            so it's clear which cell the hour starts at.
            Each label spans 2 columns (= one full hour) but text is left-
            aligned → reads as "this cell starts at HH:00". */}
        <div style={{ display: "flex", alignItems: "flex-end", marginBottom: GAP }}>
          <div style={{ width: DAY_LABEL_W, flexShrink: 0 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              columnGap: GAP,
            }}
          >
            {HOUR_LABELS.map((h) => (
              <div
                key={h}
                style={{
                  gridColumn: "span 2",
                  textAlign: "left",
                  fontSize: 9,
                  fontWeight: 600,
                  color: "var(--fg-4)",
                  opacity: 0.75,
                  lineHeight: 1,
                  paddingBottom: 3,
                  userSelect: "none",
                  overflow: "hidden",
                }}
              >
                {h}
              </div>
            ))}
          </div>
        </div>

        {/* ── Day rows ───────────────────────────────────────────────
            Each row: [day label | cells grid]
            The cells grid has the same column template as the header above
            → every column lines up with its hour label. */}
        <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
          {weekDays.map((date, di) => (
            <div key={date} style={{ display: "flex", alignItems: "center" }}>
              <div style={DAY_LABEL_STYLE}>
                {format(parseISO(date), "EEE d")}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID_COLS,
                  columnGap: GAP,
                }}
              >
                {SLOTS.map((slot, si) => {
                  const count = matrix[di][si];
                  return (
                    <div
                      key={si}
                      title={`${format(parseISO(date), "EEE d")} · ${slot.label} · ${count} staff`}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 4,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 600,
                        lineHeight: 1,
                        cursor: "default",
                        transition: "opacity 0.1s",
                        ...cellStyle(count),
                      }}
                    >
                      {count > 0 && (count >= 4 ? "4+" : count)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Legend ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            paddingLeft: DAY_LABEL_W,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--fg-4)",
              opacity: 0.7,
              marginRight: 2,
            }}
          >
            Staff:
          </span>
          {[0, 1, 2, 3, 4].map((n) => {
            const cs = cellStyle(n);
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 4,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 600,
                    ...cs,
                  }}
                >
                  {n > 0 && (n >= 4 ? "4+" : n)}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--fg-4)",
                    opacity: 0.6,
                  }}
                >
                  {n === 4 ? "4+" : n}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
