"use client";
import Link from "next/link";

export interface TaxTag {
  label: string;
  variant: "green" | "amber" | "red" | "blue" | "purple" | "muted";
}

export interface TaxCardProps {
  icon: string;
  rate: string;
  name: string;
  subtitle?: string;
  description: string;
  tags?: TaxTag[];
  deadline?: string;
  href: string;
  variant?: "default" | "dark" | "highlighted";
  style?: React.CSSProperties;
}

const TAG_STYLES: Record<TaxTag["variant"], { bg: string; color: string }> = {
  green:  { bg: "var(--good-soft)",  color: "var(--good)" },
  amber:  { bg: "var(--warn-soft)",  color: "var(--warn)" },
  red:    { bg: "var(--bad-soft)",   color: "var(--bad)" },
  blue:   { bg: "var(--info-soft)",  color: "var(--info)" },
  purple: { bg: "var(--info-soft)",  color: "var(--info)" },
  muted:  { bg: "var(--bg-2)",       color: "var(--fg-3)" },
};

export function TaxCard({
  icon,
  rate,
  name,
  subtitle,
  description,
  tags,
  deadline,
  href,
  variant = "default",
  style,
}: TaxCardProps) {
  const isDark = variant === "dark";
  const isHighlighted = variant === "highlighted";

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderRadius: "var(--r-lg)",
        border: `1px solid ${isHighlighted ? "var(--bronze)" : isDark ? "var(--bg-2)" : "var(--line)"}`,
        background: isHighlighted ? "var(--bronze-soft)" : isDark ? "var(--bg-2)" : "var(--surface)",
        padding: 16,
        transition: "border-color 200ms, box-shadow 200ms, transform 200ms",
        textDecoration: "none",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--bronze)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isHighlighted ? "var(--bronze)" : isDark ? "var(--bg-2)" : "var(--line)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Row 1: icon + rate */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
        <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--bronze)", lineHeight: 1 }}>
          {rate}
        </span>
      </div>

      {/* Row 2: name + subtitle */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? "var(--sand)" : "var(--fg)", lineHeight: "1.2" }}>
          {name}
        </span>
        {subtitle && (
          <span style={{ fontSize: 10, color: "var(--fg-3)", lineHeight: "1.2", flexShrink: 0 }}>
            {subtitle}
          </span>
        )}
      </div>

      {/* Row 3: description */}
      <p style={{ fontSize: 11.5, lineHeight: 1.6, color: isDark ? "var(--fg-3)" : "var(--fg-3)", margin: 0 }}>
        {description}
      </p>

      {/* Row 4: tags */}
      {tags && tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {tags.map((tag) => (
            <span
              key={tag.label}
              style={{
                borderRadius: "var(--r-pill)",
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 500,
                background: TAG_STYLES[tag.variant].bg,
                color: TAG_STYLES[tag.variant].color,
              }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Row 5: footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "var(--line)"}`, paddingTop: 10, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: "var(--fg-4)" }}>{deadline ?? ""}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--bronze)" }}>Voir détails →</span>
      </div>
    </Link>
  );
}
