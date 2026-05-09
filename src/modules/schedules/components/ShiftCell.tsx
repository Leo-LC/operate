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

// Inline styles for cell containers — these guarantee colors render even when
// Tailwind's content scanner doesn't include this module's directory.
function containerStyle(isOff: boolean, hours: number): React.CSSProperties {
  if (isOff) {
    return {
      backgroundColor: "rgba(107, 114, 128, 0.07)",
      border: "1px solid rgba(107, 114, 128, 0.2)",
      borderRadius: 6,
    };
  }
  if (hours === 0) {
    // Start set but end equals start or produces 0 hours — treat as incomplete.
    return {
      backgroundColor: "rgba(245, 158, 11, 0.07)",
      borderTop: "1px dashed rgba(245, 158, 11, 0.4)",
      borderRight: "1px dashed rgba(245, 158, 11, 0.4)",
      borderBottom: "1px dashed rgba(245, 158, 11, 0.4)",
      borderLeft: "3px solid rgba(245, 158, 11, 0.6)",
      borderRadius: 6,
    };
  }
  return {
    backgroundColor: "rgba(14, 165, 233, 0.07)",
    borderTop: "1px solid rgba(14, 165, 233, 0.2)",
    borderRight: "1px solid rgba(14, 165, 233, 0.2)",
    borderBottom: "1px solid rgba(14, 165, 233, 0.2)",
    borderLeft: "3px solid rgba(14, 165, 233, 0.7)",
    borderRadius: 6,
  };
}

function hoursBadgeStyle(isOff: boolean, hours: number): React.CSSProperties {
  if (isOff) {
    return {
      backgroundColor: "transparent",
      color: "rgba(156, 163, 175, 0.5)",
      fontSize: 9,
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      fontWeight: 600,
    };
  }
  if (hours === 0) {
    return {
      backgroundColor: "rgba(245, 158, 11, 0.1)",
      color: "rgba(245, 158, 11, 0.85)",
      fontSize: 10,
      fontWeight: 700,
      borderRadius: 3,
      padding: "1px 4px",
    };
  }
  return {
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    color: "rgba(14, 165, 233, 0.9)",
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 3,
    padding: "1px 4px",
  };
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
        ...containerStyle(isOff, hours),
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 6px 7px",
        minHeight: 88,
        position: "relative",
        transition: "box-shadow 0.1s",
        cursor: isOff ? "default" : "grab",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 1px rgba(107,114,128,0.4)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
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
          ...hoursBadgeStyle(isOff, hours),
        }}
      >
        {isOff ? "OFF" : hours > 0 ? `${hours.toFixed(1)}h` : "—"}
      </div>
    </div>
  );
}
