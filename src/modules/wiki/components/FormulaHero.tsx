export function ThaiTaxFormulaHero() {
  return (
    <div style={{ borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: 20 }}>
      {/* Label */}
      <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 12 }}>
        La formule fondamentale
      </p>

      {/* Formula row */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        {/* Blue chip: CA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, borderRadius: "var(--r-sm)", background: "var(--info-soft)", padding: "8px 12px" }}>
          <span className="eyebrow" style={{ color: "var(--info)" }}>Chiffre d&apos;affaires</span>
          <span className="mono" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: "var(--info)" }}>CA</span>
          <span style={{ fontSize: 9.5, color: "var(--info)" }}>hors VAT · top line</span>
        </div>

        {/* Operator − */}
        <span style={{ fontSize: 24, fontWeight: 300, color: "var(--fg-4)" }}>−</span>

        {/* Amber chip: Expenses */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, borderRadius: "var(--r-sm)", background: "var(--warn-soft)", padding: "8px 12px" }}>
          <span className="eyebrow" style={{ color: "var(--warn)" }}>Charges</span>
          <span className="mono" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: "var(--warn)" }}>Expenses</span>
          <span style={{ fontSize: 9.5, color: "var(--warn)" }}>salaires, loyers, fournisseurs…</span>
        </div>

        {/* Operator = */}
        <span style={{ fontSize: 24, fontWeight: 300, color: "var(--fg-4)" }}>=</span>

        {/* Green chip: Profit */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, borderRadius: "var(--r-sm)", background: "var(--good-soft)", padding: "8px 12px" }}>
          <span className="eyebrow" style={{ color: "var(--good)" }}>Bénéfice net</span>
          <span className="mono" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: "var(--good)" }}>Profit</span>
          <span style={{ fontSize: 9.5, color: "var(--good)" }}>bottom line · base imposable</span>
        </div>

        {/* Operator → */}
        <span style={{ fontSize: 24, fontWeight: 300, color: "var(--fg-4)" }}>→</span>

        {/* Red chip: CIT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, borderRadius: "var(--r-sm)", background: "var(--bad-soft)", padding: "8px 12px" }}>
          <span className="eyebrow" style={{ color: "var(--bad)" }}>Impôt sociétés</span>
          <span className="mono" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: "var(--bad)" }}>CIT</span>
          <span style={{ fontSize: 9.5, color: "var(--bad)" }}>15–20% selon seuils</span>
        </div>
      </div>

      {/* Note */}
      <p style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12, fontSize: 11, lineHeight: 1.7, color: "var(--fg-3)" }}>
        Tout le reste sur cette page est un détail de l&apos;un de ces 4 éléments.{" "}
        <strong style={{ color: "var(--bronze)" }}>La VAT n&apos;est pas du CA</strong> — tu
        la collectes pour l&apos;État, elle transite sans t&apos;appartenir.{" "}
        <strong style={{ color: "var(--bronze)" }}>Seul le bénéfice net est taxé</strong> via
        l&apos;impôt sur les sociétés.
      </p>
    </div>
  );
}
