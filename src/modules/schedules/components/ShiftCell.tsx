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

function containerStyle(isOff: boolean, hours: number): React.CSSProperties {
  if (isOff) return { backgroundColor: "transparent" };
  if (hours === 0) return { backgroundColor: "var(--warn-soft)" };
  return { backgroundColor: "var(--info-soft)" };
}

function hoursBadgeStyle(isOff: boolean, hours: number): React.CSSProperties {
  if (isOff) return { color: "var(--fg-mute)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontWeight: 600 };
  if (hours === 0) return { color: "var(--warn)", fontSize: 10, fontWeight: 700 };
  return { color: "var(--info)", fontSize: 10, fontWeight: 700 };
}

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  height: 24,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)",
  backgroundColor: "var(--bg)",
  color: "var(--fg)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
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
      className="group"
      style={{
        ...containerStyle(isOff, hours),
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
            style={{ borderRadius: 4, padding: "2px 4px", fontSize: 9, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--fg-3)", lineHeight: 1, cursor: "pointer" }}>
            C
          </button>
        )}
        {hasCopied && (
          <button type="button" title="Paste" onClick={onPaste}
            style={{ borderRadius: 4, padding: "2px 4px", fontSize: 9, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--fg-3)", lineHeight: 1, cursor: "pointer" }}>
            P
          </button>
        )}
        {!isOff && (
          <button type="button" title="Clear" onClick={onClear}
            style={{ borderRadius: 4, padding: "2px 4px", fontSize: 9, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--fg-3)", lineHeight: 1, cursor: "pointer" }}>
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
