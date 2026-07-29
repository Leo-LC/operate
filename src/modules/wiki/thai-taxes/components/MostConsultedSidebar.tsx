"use client";
import Link from "next/link";
import { getArticle } from "../articles";
import { useWikiLang } from "./LanguageProvider";

/** Static curated ranking — no analytics backend exists yet for real view counts. */
const MOST_CONSULTED_SLUGS = [
  "vat-pp30",
  "wht-services-pnd3-53",
  "pnd51",
  "sme-progressive-rates",
  "ssf",
];

export function MostConsultedSidebar() {
  const { lang, t } = useWikiLang();
  const items = MOST_CONSULTED_SLUGS.map((slug) => getArticle(slug)).filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 14 }}>
      <p className="eyebrow" style={{ color: "var(--bronze)" }}>{t({ fr: "Articles les plus consultés", en: "Most consulted articles" })}</p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((article, i) => (
          <Link
            key={article.slug}
            href={`/wiki/thai-taxes/${article.slug}`}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none", textDecoration: "none" }}
          >
            <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-4)", width: 12 }}>{i + 1}</span>
            <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{article.title[lang]}</span>
          </Link>
        ))}
      </div>
      <Link href="/wiki/thai-taxes" style={{ fontSize: 10, fontWeight: 600, color: "var(--bronze)", textDecoration: "none" }}>
        {t({ fr: "Voir tous les articles →", en: "See all articles →" })}
      </Link>
    </div>
  );
}
