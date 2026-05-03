"use client";
import { useRef } from "react";
import type { CellData } from "@/modules/schedules/types";

interface Props {
  data: CellData;
  onChange: (patch: Partial<CellData>) => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  hasCopied: boolean;
  onDragStart: () => void;
  onDrop: () => void;
}

const TIME_OPTIONS = Array.from({ length: (22 - 6) * 2 }).map((_, i) => {
  const h = 6 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

function shiftBg(start: string) {
  if (!start) return "bg-muted/30";
  const h = parseInt(start.split(":")[0], 10);
  if (h < 8) return "bg-blue-100 dark:bg-blue-900/30";
  if (h < 10) return "bg-amber-100 dark:bg-amber-900/30";
  if (h < 13) return "bg-green-100 dark:bg-green-900/30";
  return "bg-orange-100 dark:bg-orange-900/30";
}

export function ShiftCell({ data, onChange, onCopy, onPaste, onClear, hasCopied, onDragStart, onDrop }: Props) {
  const cellRef = useRef<HTMLDivElement>(null);
  const isOff = !data.start_time;

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
  }

  return (
    <div
      ref={cellRef}
      draggable={!isOff}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className={`relative group min-h-[64px] rounded border border-border p-1.5 flex flex-col gap-1 transition-colors ${shiftBg(data.start_time)} hover:ring-1 hover:ring-ring`}
      onContextMenu={handleContextMenu}
    >
      {/* Context menu (right-click shows via title tooltip fallback; actual menu via buttons on hover) */}
      <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 z-10">
        {!isOff && (
          <button
            type="button"
            title="Copy shift"
            onClick={onCopy}
            className="rounded px-1 py-0.5 text-[10px] bg-background border border-border hover:bg-accent leading-none"
          >
            C
          </button>
        )}
        {hasCopied && (
          <button
            type="button"
            title="Paste shift"
            onClick={onPaste}
            className="rounded px-1 py-0.5 text-[10px] bg-background border border-border hover:bg-accent leading-none"
          >
            P
          </button>
        )}
        {!isOff && (
          <button
            type="button"
            title="Clear shift"
            onClick={onClear}
            className="rounded px-1 py-0.5 text-[10px] bg-background border border-border hover:bg-destructive hover:text-destructive-foreground leading-none"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex gap-1 items-center">
        <select
          value={data.start_time}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ start_time: val, end_time: val && !data.end_time ? val : data.end_time, dirty: true });
          }}
          className="flex-1 h-6 rounded text-xs bg-transparent border border-input px-1 min-w-0"
          title="Start time"
        >
          <option value="">OFF</option>
          {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-muted-foreground text-xs shrink-0">–</span>
        <select
          value={data.end_time}
          onChange={(e) => onChange({ end_time: e.target.value, dirty: true })}
          disabled={isOff}
          className="flex-1 h-6 rounded text-xs bg-transparent border border-input px-1 min-w-0 disabled:opacity-40"
          title="End time"
        >
          <option value="">—</option>
          {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {!isOff && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Break</span>
          <select
            value={data.break_minutes}
            onChange={(e) => onChange({ break_minutes: parseInt(e.target.value, 10), dirty: true })}
            className="h-5 rounded text-[10px] bg-transparent border border-input px-1"
          >
            {[0, 15, 30, 45, 60].map((m) => <option key={m} value={m}>{m}m</option>)}
          </select>
        </div>
      )}

      {isOff && (
        <span className="text-xs text-muted-foreground/60 text-center mt-auto">Day off</span>
      )}
    </div>
  );
}
