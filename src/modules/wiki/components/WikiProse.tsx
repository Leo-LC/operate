interface WikiProseProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  sections: { heading: string; body: string }[];
  updatedAt?: string;
}

export function WikiProse({ title, eyebrow, subtitle, sections, updatedAt }: WikiProseProps) {
  return (
    <article style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {eyebrow && (
          <p className="eyebrow" style={{ color: "var(--bronze)" }}>{eyebrow}</p>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg)" }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--fg-3)" }}>{subtitle}</p>
        )}
        {updatedAt && (
          <p style={{ fontSize: 12, color: "var(--fg-4)" }}>Mis à jour le {updatedAt}</p>
        )}
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {sections.map((section, i) => (
          <section key={i}>
            <h2 style={{ marginBottom: 8, fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>
              {section.heading}
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--fg-2)" }}>{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
