interface CalendarEntry {
  code: string;
  description: string;
}

interface CalendarColumn {
  label: string;
  sub: string;
  entries: CalendarEntry[];
}

const columns: CalendarColumn[] = [
  {
    label: "Chaque mois",
    sub: "avant le 7 ou le 15",
    entries: [
      { code: "PP.30 / VAT", description: "avant le 15 (23 si e-filing)" },
      { code: "PP.1 / PP.3 / WHT", description: "sociétés / individus · avant le 7" },
      { code: "PND.1 / PIT salariés", description: "avant le 7" },
      { code: "SSF / Sécurité sociale", description: "avant le 15" },
    ],
  },
  {
    label: "Trimestriel",
    sub: "option PME uniquement",
    entries: [
      { code: "PP.30 / VAT", description: "si option trimestrielle accordée" },
      { code: "PP.1 / WHT", description: "si option trimestrielle" },
    ],
  },
  {
    label: "Mi-exercice",
    sub: "2 mois après le 6e mois",
    entries: [
      { code: "PND.51 / Acompte CIT", description: "50% de l'impôt estimé" },
    ],
  },
  {
    label: "Annuel",
    sub: "150 jours après clôture",
    entries: [
      { code: "PND.50 / Déclaration CIT", description: "complète" },
      { code: "PND.1 Kor / Récapitulatif", description: "annuel salaires" },
      { code: "États financiers / DBD", description: "5 mois après clôture" },
    ],
  },
];

export function ThaiTaxCalendarStrip() {
  return (
    <div style={{ overflow: "hidden", borderRadius: "var(--r-lg)", border: "1px solid var(--line)" }}>
      {/* Header row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "var(--bg-2)" }}>
        {columns.map((col, i) => (
          <div
            key={col.label}
            style={{ borderRight: i < columns.length - 1 ? "1px solid var(--line)" : "none", padding: "10px 12px" }}
          >
            <p className="eyebrow" style={{ color: "var(--bronze)" }}>{col.label}</p>
            <p style={{ fontSize: 8.5, color: "var(--fg-4)" }}>{col.sub}</p>
          </div>
        ))}
      </div>

      {/* Content row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "var(--surface)" }}>
        {columns.map((col, i) => (
          <div key={col.label} style={{ borderRight: i < columns.length - 1 ? "1px solid var(--line)" : "none", padding: 10 }}>
            {col.entries.map((entry, j) => (
              <div key={entry.code} style={{ marginBottom: j < col.entries.length - 1 ? 8 : 0, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ marginTop: 6, width: 5, height: 5, flexShrink: 0, borderRadius: "50%", background: "var(--bronze)" }} />
                <div>
                  <p className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: "var(--fg)" }}>{entry.code}</p>
                  <p style={{ fontSize: 8.5, color: "var(--fg-3)" }}>{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
