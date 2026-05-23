"use client";
import type { CellData } from "@/modules/schedules/types";

export function computeShiftHours(start: string, end: string, breakMin = 30): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff <= breakMin ? 0 : (diff - breakMin) / 60;
}

interface Props {
  data: CellData;
  hours: number;
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

// Inline styles — guarantee colors render even when Tailwind scanner misses this file.
function shiftBg(startTime: string): string {
  // Morning: start 07:00 or 07:30 → blue
  if (startTime <= "07:30") return "rgba(59, 130, 246, 0.18)";
  // Middle: after 07:30, before 12:00 → orange
  if (startTime < "12:00") return "rgba(249, 115, 22, 0.18)";
  // Evening: 12:00+ → red
  return "rgba(239, 68, 68, 0.18)";
}

function shiftTextColor(startTime: string): string {
  if (startTime <= "07:30") return "rgba(37, 99, 235, 0.9)";
  if (startTime < "12:00") return "rgba(194, 65, 12, 0.9)";
  return "rgba(185, 28, 28, 0.9)";
}

function containerStyle(isOff: boolean, hours: number, startTime: string): React.CSSProperties {
  if (isOff) return { backgroundColor: "rgba(107, 114, 128, 0.05)" };
  if (hours === 0) return { backgroundColor: "rgba(245, 158, 11, 0.12)" };
  return { backgroundColor: shiftBg(startTime) };
}

function hoursBadgeStyle(isOff: boolean, hours: number, startTime: string): React.CSSProperties {
  if (isOff) return { color: "rgba(156, 163, 175, 0.5)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 600 };
  if (hours === 0) return { color: "rgba(245, 158, 11, 0.9)", fontSize: 10, fontWeight: 700 };
  return { color: shiftTextColor(startTime), fontSize: 10, fontWeight: 700 };
}

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  height: 24,
  borderRadius: 4,
  border: "1px solid rgba(107, 114, 128, 0.3)",
  backgroundColor: "rgba(0, 0, 0, 0.15)",
  color: "inherit",
  fontSize: 11,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  padding: "0 2px",
  cursor: "pointer",
  boxSizing: "border-box" as const,
  outline: "none",
};

export function ShiftCell({
  data,
  hours,
  onChange,
  onCopy,
  onPaste,
  onClear,
  hasCopied,
  onDragStart,
  onDrop,
}: Props) {
  const isOff = !data.start_time;

  return (
    <div
      draggable={!isOff}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className="relative group"
      style={{
        ...containerStyle(isOff, hours, data.start_time ?? ""),
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 6px 7px",
        minHeight: 88,
        height: "100%",
        position: "relative",
        cursor: isOff ? "default" : "grab",
      }}
    >
      {/* ── Hover action buttons ─────────────────────────────────── */}
      <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 z-10">
        {!isOff && (
          <button type="button" title="Copy" onClick={onCopy}
            className="rounded px-1 py-0.5 text-[9px] bg-background border border-border hover:bg-accent leading-none">
            C
          </button>
        )}
        {hasCopied && (
          <button type="button" title="Paste" onClick={onPaste}
            className="rounded px-1 py-0.5 text-[9px] bg-background border border-border hover:bg-accent leading-none">
            P
          </button>
        )}
        {!isOff && (
          <button type="button" title="Clear" onClick={onClear}
            className="rounded px-1 py-0.5 text-[9px] bg-background border border-border hover:bg-destructive hover:text-destructive-foreground leading-none">
            ✕
          </button>
        )}
      </div>

      {/* ── Start time ───────────────────────────────────────────── */}
      <select
        value={data.start_time}
        onChange={(e) => {
          const val = e.target.value;
          onChange({ start_time: val, end_time: val && !data.end_time ? val : data.end_time, dirty: true });
        }}
        style={SELECT_STYLE}
        title="Start time"
      >
        <option value="">OFF</option>
        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* ── End time ─────────────────────────────────────────────── */}
      <select
        value={data.end_time}
        onChange={(e) => onChange({ end_time: e.target.value, dirty: true })}
        disabled={isOff}
        style={{
          ...SELECT_STYLE,
          opacity: isOff ? 0.25 : 1,
          cursor: isOff ? "default" : "pointer",
        }}
        title="End time"
      >
        <option value="">—</option>
        {TIME_OPTIONS.filter((t) => !data.start_time || t > data.start_time).map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* ── Hours badge / OFF label ───────────────────────────────── */}
      <div
        style={{
          textAlign: "center",
          lineHeight: 1,
          marginTop: 1,
          ...hoursBadgeStyle(isOff, hours, data.start_time ?? ""),
        }}
      >
        {isOff ? "OFF" : hours > 0 ? `${hours.toFixed(1)}h` : "—"}
      </div>
    </div>
  );
}
