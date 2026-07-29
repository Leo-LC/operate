"use client";
import Link from "next/link";
import type { TaxArticle } from "../types";
import { useWikiLang } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { StatusBadge } from "./StatusBadge";

const CADENCE_LABEL: Record<string, Record<"fr" | "en", string>> = {
  monthly: { fr: "Mensuel", en: "Monthly" },
  quarterly: { fr: "Trimestriel", en: "Quarterly" },
  "half-year": { fr: "Mi-exercice", en: "Half-year" },
  annual: { fr: "Annuel", en: "Annual" },
  occasional: { fr: "Ponctuel", en: "Occasional" },
  permanent: { fr: "Permanent", en: "Permanent" },
};

export function ArticleHeader({ article }: { article: TaxArticle }) {
  const { lang, t } = useWikiLang();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--fg-3)" }}>
          <Link href="/wiki" style={{ color: "var(--fg-3)", textDecoration: "none" }}>Wiki</Link>
          <span style={{ color: "var(--line-strong)" }}>›</span>
          <Link href="/wiki/thai-taxes" style={{ color: "var(--fg-3)", textDecoration: "none" }}>
            {t({ fr: "Thaïlande Taxes", en: "Thailand Taxes" })}
          </Link>
          <span style={{ color: "var(--line-strong)" }}>›</span>
          <span style={{ fontWeight: 600, color: "var(--fg)" }}>{article.title[lang]}</span>
        </nav>
        <LanguageToggle />
      </div>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>
          {article.title[lang]}
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6, color: "var(--fg-3)", maxWidth: 640 }}>
          {article.summary[lang]}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <StatusBadge status={article.status} lang={lang} />
        <Tag>{CADENCE_LABEL[article.cadence]?.[lang] ?? article.cadence}</Tag>
        {article.forms.map((form) => (
          <Tag key={form} muted>{form}</Tag>
        ))}
        {article.tags.includes("important") && (
          <Tag variant="warn">{t({ fr: "Très important", en: "Very important" })}</Tag>
        )}
        {article.tags.includes("cashflow") && (
          <Tag variant="bad">{t({ fr: "Impact cashflow", en: "Cashflow impact" })}</Tag>
        )}
      </div>
    </div>
  );
}

function Tag({ children, muted, variant }: { children: React.ReactNode; muted?: boolean; variant?: "warn" | "bad" }) {
  const styles = variant === "warn"
    ? { bg: "var(--warn-soft)", color: "var(--warn)" }
    : variant === "bad"
    ? { bg: "var(--bad-soft)", color: "var(--bad)" }
    : muted
    ? { bg: "var(--bg-2)", color: "var(--fg-3)" }
    : { bg: "var(--bronze-soft)", color: "var(--bronze)" };
  return (
    <span style={{ borderRadius: "var(--r-pill)", padding: "3px 9px", fontSize: 10, fontWeight: 600, background: styles.bg, color: styles.color }}>
      {children}
    </span>
  );
}
