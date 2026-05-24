interface SectionHeaderProps {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 7, height: 7, flexShrink: 0, borderRadius: "50%", background: "var(--bronze)" }} />
      <span className="eyebrow" style={{ color: "var(--bronze)" }}>
        {title}
      </span>
      <span style={{ height: 1, flex: 1, background: "var(--line-strong)" }} />
      {count !== undefined && (
        <span style={{ fontSize: 10, color: "var(--fg-4)" }}>{count} taxes</span>
      )}
    </div>
  );
}
