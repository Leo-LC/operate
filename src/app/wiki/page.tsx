import Link from "next/link";
import { ChevronRightIcon, ClockIcon } from "lucide-react";

export default function PublicWikiIndexPage() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Wiki</h1>
        <p style={{ marginTop: 4, fontSize: 13, color: "var(--fg-3)" }}>Base de connaissances</p>
      </div>

      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span className="eyebrow" style={{ color: "var(--bronze)" }}>
            Comptabilité &amp; Fiscalité
          </span>
          <span style={{ height: 1, flex: 1, background: "var(--line)" }} />
        </div>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, 1fr)" }}>
          <Link
            href="/wiki/thai-taxes"
            aria-label="Comptabilité & Taxes en Thaïlande"
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              padding: 16,
              textDecoration: "none",
              transition: "border-color 150ms, box-shadow 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--bronze)"; e.currentTarget.style.boxShadow = "var(--shadow-1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontWeight: 500, color: "var(--fg)", lineHeight: 1.3, margin: 0 }}>
                Comptabilité &amp; Taxes en Thaïlande
              </p>
              <p style={{ marginTop: 4, fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5 }}>
                Vue d&apos;ensemble complète de la fiscalité thaïlandaise : VAT, retenues à la
                source, impôt sur les sociétés, charges sociales, dividendes et calendrier des
                déclarations.
              </p>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--fg-4)" }}>
                <ClockIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
                <time dateTime="2026-05-21">21 mai 2026</time>
              </div>
            </div>
            <ChevronRightIcon style={{ marginLeft: 12, marginTop: 2, width: 16, height: 16, flexShrink: 0, color: "var(--fg-4)" }} />
          </Link>
        </div>
      </section>
    </div>
  );
}
