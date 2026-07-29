"use client";
import Link from "next/link";
import { useWikiLang } from "./LanguageProvider";

const STEPS = [
  {
    n: 1,
    title: { fr: "Comprendre les bases", en: "Understand the basics" },
    desc: {
      fr: "Explorez les concepts essentiels et le flux fiscal de votre société.",
      en: "Explore the essential concepts and your company's tax flow.",
    },
    href: "/wiki/thai-taxes/tax-flow-basics",
  },
  {
    n: 2,
    title: { fr: "Identifier vos obligations", en: "Identify your obligations" },
    desc: {
      fr: "Consultez le calendrier et les déclarations qui vous concernent.",
      en: "Check the calendar and the filings that concern you.",
    },
    href: "/wiki/thai-taxes/fiscal-calendar",
  },
  {
    n: 3,
    title: { fr: "Agir & déclarer dans les temps", en: "Act & file on time" },
    desc: {
      fr: "Suivez les échéances et gardez votre trésorerie conforme.",
      en: "Track deadlines and keep your treasury compliant.",
    },
    href: "/wiki/thai-taxes/treasury-tax-planning",
  },
];

export function QuickStartCards() {
  const { t } = useWikiLang();
  return (
    <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 18 }}>
      <p className="eyebrow" style={{ color: "var(--bronze)", marginBottom: 12 }}>
        {t({ fr: "Par où commencer ?", en: "Where to start?" })}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {STEPS.map((step) => (
          <div key={step.n} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              className="mono"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--bronze-soft)",
                color: "var(--bronze)",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {step.n}
            </span>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)" }}>{t(step.title)}</p>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: "var(--fg-3)" }}>{t(step.desc)}</p>
          </div>
        ))}
      </div>
      <Link
        href="/wiki/thai-taxes/tax-flow-basics"
        style={{
          marginTop: 14,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          fontWeight: 700,
          color: "var(--bronze)",
          textDecoration: "none",
        }}
      >
        {t({ fr: "Voir le guide du débutant", en: "See the beginner guide" })} →
      </Link>
    </div>
  );
}
