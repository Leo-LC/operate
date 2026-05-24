import { ReactNode } from "react";
import Link from "next/link";

export interface DetailHeroTag {
  label: string;
  variant: "green" | "amber" | "red" | "blue" | "muted";
}

const TAG_STYLES: Record<DetailHeroTag["variant"], { bg: string; color: string }> = {
  green:  { bg: "var(--good-soft)",  color: "var(--good)" },
  amber:  { bg: "var(--warn-soft)",  color: "var(--warn)" },
  red:    { bg: "var(--bad-soft)",   color: "var(--bad)" },
  blue:   { bg: "var(--info-soft)",  color: "var(--info)" },
  muted:  { bg: "rgba(255,255,255,0.1)", color: "var(--fg-3)" },
};

export interface DetailHeroProps {
  rate: string;
  name: string;
  subtitle: string;
  tags: DetailHeroTag[];
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  breadcrumbs: BreadcrumbItem[];
  hero: DetailHeroProps;
  children: ReactNode;
}

export function WikiDetailLayout({ breadcrumbs, hero, children }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--fg-3)" }}>
        {breadcrumbs.map((item, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: "var(--line-strong)" }}>›</span>}
              {item.href ? (
                <Link href={item.href} style={{ color: "var(--fg-3)", textDecoration: "none" }}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} style={{ fontWeight: 600, color: "var(--fg)" }}>
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      {/* Hero block */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: 20 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ marginBottom: 4, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{hero.name}</p>
          <p style={{ marginBottom: 12, maxWidth: 440, fontSize: 11, lineHeight: 1.6, color: "var(--fg-4)" }}>
            {hero.subtitle}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {hero.tags.map((tag) => (
              <span
                key={tag.label}
                style={{
                  borderRadius: "var(--r-sm)",
                  padding: "2px 8px",
                  fontSize: 8.5,
                  fontWeight: 500,
                  background: TAG_STYLES[tag.variant].bg,
                  color: TAG_STYLES[tag.variant].color,
                }}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
        <span className="mono" style={{ flexShrink: 0, fontSize: 34, fontWeight: 800, lineHeight: 1, color: "var(--bronze)" }}>
          {hero.rate}
        </span>
      </div>

      {/* Page content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>{children}</div>
    </div>
  );
}

/* ─── Section primitives ─────────────────────────────────────────── */

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="eyebrow" style={{ color: "var(--bronze)" }}>{title}</span>
        <span style={{ height: 1, flex: 1, background: "var(--line)" }} />
      </div>
      {children}
    </div>
  );
}

interface FormulaBlockProps {
  children: string;
}

export function FormulaBlock({ children }: FormulaBlockProps) {
  return (
    <div className="mono" style={{ borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg)", padding: "8px 12px", fontSize: 13, color: "var(--fg)" }}>
      {children}
    </div>
  );
}

interface ExampleBlockProps {
  label: string;
  children: ReactNode;
}

export function ExampleBlock({ label, children }: ExampleBlockProps) {
  return (
    <div style={{ borderRadius: "var(--r-md)", background: "var(--bronze-soft)", padding: 14 }}>
      <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 8 }}>{label}</p>
      {children}
    </div>
  );
}

interface ExampleFlowProps {
  items: string[];
}

export function ExampleFlow({ items }: ExampleFlowProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      {items.map((item, i) => (
        <span key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ color: "var(--bronze)" }}>→</span>}
          <span style={{ borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--surface)", padding: "2px 8px", fontSize: 11 }}>
            {item}
          </span>
        </span>
      ))}
    </div>
  );
}

interface ThresholdTableProps {
  headers: string[];
  rows: (string | ReactNode)[][];
}

export function ThresholdTable({ headers, rows }: ThresholdTableProps) {
  return (
    <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              scope="col"
              className="eyebrow"
              style={{ borderBottom: "1px solid var(--line)", paddingBottom: 6, color: "var(--fg-3)" }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                style={{ borderBottom: ci < row.length - 1 ? "1px solid var(--line)" : "none", padding: "6px 0", fontSize: 11.5, color: "var(--fg-2)" }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface DeadlineCardsProps {
  items: { label: string; value: string; sub?: string }[];
}

export function DeadlineCards({ items }: DeadlineCardsProps) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {items.map((item) => (
        <div
          key={item.label}
          style={{ flex: 1, borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", padding: 10 }}
        >
          <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 2 }}>{item.label}</p>
          <p className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--fg)" }}>{item.value}</p>
          {item.sub && <p style={{ marginTop: 2, fontSize: 8.5, color: "var(--fg-4)" }}>{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

interface RelatedCardsProps {
  items: { icon: string; label: string; href: string }[];
}

export function RelatedCards({ items }: RelatedCardsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", padding: "8px 12px", fontSize: 10, fontWeight: 600, color: "var(--fg)", textDecoration: "none", transition: "border-color 150ms, color 150ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--bronze)"; e.currentTarget.style.color = "var(--bronze)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--fg)"; }}
        >
          <span>
            <span aria-hidden="true">{item.icon} </span>{item.label}
          </span>
          <span aria-hidden="true" style={{ color: "var(--bronze)" }}>→</span>
        </Link>
      ))}
    </div>
  );
}
