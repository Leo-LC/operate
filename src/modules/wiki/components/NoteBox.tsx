import { ReactNode } from "react";

interface NoteBoxProps {
  icon?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function NoteBox({ icon = "💡", children, style }: NoteBoxProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        borderRadius: "0 var(--r-md) var(--r-md) 0",
        borderTop: "1px solid var(--warn)",
        borderRight: "1px solid var(--warn)",
        borderBottom: "1px solid var(--warn)",
        borderLeft: "2px solid var(--bronze)",
        background: "var(--bronze-soft)",
        padding: 14,
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ marginTop: 2, flexShrink: 0, fontSize: 14 }}>{icon}</span>
      <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--fg-2)" }}>{children}</div>
    </div>
  );
}
