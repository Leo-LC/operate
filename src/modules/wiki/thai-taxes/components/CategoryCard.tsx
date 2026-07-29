"use client";
import Link from "next/link";
import type { TaxFamily } from "../families";
import { getArticle } from "../articles";
import { useWikiLang } from "./LanguageProvider";
import { useWikiFilters } from "./ArticleFilters";
import { StatusBadge } from "./StatusBadge";

const CADENCE_LABEL: Record<string, Record<"fr" | "en", string>> = {
  monthly: { fr: "Mensuel", en: "Monthly" },
  quarterly: { fr: "Trimestriel", en: "Quarterly" },
  "half-year": { fr: "Mi-exercice", en: "Half-year" },
  annual: { fr: "Annuel", en: "Annual" },
  occasional: { fr: "Ponctuel", en: "Occasional" },
  permanent: { fr: "Permanent", en: "Permanent" },
};

export function CategoryCard({ family }: { family: TaxFamily }) {
  const { lang, t } = useWikiLang();
  const { matches, active: filtersActive } = useWikiFilters();
  const allArticles = family.slugs.map((slug) => getArticle(slug)).filter((a): a is NonNullable<typeof a> => Boolean(a));
  const articles = filtersActive ? allArticles.filter(matches) : allArticles;

  if (filtersActive && articles.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{family.icon}</span>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", flex: 1 }}>{t(family.label)}</p>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-4)" }}>{articles.length}</span>
      </div>
      <p style={{ fontSize: 11, lineHeight: 1.5, color: "var(--fg-3)" }}>{t(family.description)}</p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/wiki/thai-taxes/${article.slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "7px 0",
              borderTop: "1px solid var(--line)",
              textDecoration: "none",
              color: "var(--fg-2)",
            }}
          >
            <span style={{ fontSize: 11.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {article.title[lang]}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <StatusBadge status={article.status} lang={lang} />
              <span
                className="mono"
                style={{ fontSize: 9, fontWeight: 600, color: "var(--fg-4)" }}
              >
                {CADENCE_LABEL[article.cadence]?.[lang] ?? article.cadence}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
