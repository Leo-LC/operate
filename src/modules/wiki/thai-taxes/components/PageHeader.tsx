"use client";
import Link from "next/link";
import { useWikiLang } from "./LanguageProvider";

export function PageHeader() {
  const { t } = useWikiLang();
  return (
    <div style={{ minWidth: 0 }}>
      <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--fg-3)", marginBottom: 8 }}>
        <Link href="/wiki" style={{ color: "var(--fg-3)", textDecoration: "none" }}>Wiki</Link>
        <span style={{ color: "var(--line-strong)" }}>›</span>
        <span style={{ fontWeight: 600, color: "var(--fg)" }}>{t({ fr: "Thaïlande Taxes", en: "Thailand Taxes" })}</span>
      </nav>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>
        {t({ fr: "Comptabilité & Taxes en Thaïlande", en: "Accounting & Taxes in Thailand" })}
      </h1>
      <p style={{ marginTop: 4, fontSize: 13, color: "var(--fg-3)", maxWidth: 520 }}>
        {t({
          fr: "Votre guide complet pour comprendre et gérer les obligations comptables et fiscales en Thaïlande.",
          en: "Your complete guide to understanding and managing accounting and tax obligations in Thailand.",
        })}
      </p>
    </div>
  );
}
