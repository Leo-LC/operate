"use client";
import Link from "next/link";
import type { TaxArticle } from "../types";
import { getArticle } from "../articles";
import { useWikiLang } from "./LanguageProvider";
import { RelatedArticleCard } from "./RelatedArticleCard";

const CADENCE_LABEL: Record<string, Record<"fr" | "en", string>> = {
  monthly: { fr: "Mensuel", en: "Monthly" },
  quarterly: { fr: "Trimestriel", en: "Quarterly" },
  "half-year": { fr: "Mi-exercice", en: "Half-year" },
  annual: { fr: "Annuel", en: "Annual" },
  occasional: { fr: "Ponctuel", en: "Occasional" },
  permanent: { fr: "Permanent", en: "Permanent" },
};

function SidebarBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 14 }}>
      <p className="eyebrow" style={{ color: "var(--bronze)" }}>{title}</p>
      {children}
    </div>
  );
}

export function QuickFactsSidebar({ article }: { article: TaxArticle }) {
  const { lang, t } = useWikiLang();

  const related = article.relatedArticles.map((slug) => getArticle(slug)).filter((a): a is TaxArticle => Boolean(a));
  const showTreasuryLink = article.tags.includes("cashflow");
  const showReportsLink = article.tags.includes("evidence") || article.category === "cit";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SidebarBox title={t({ fr: "Fiche rapide", en: "Quick facts" })}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ borderRadius: "var(--r-pill)", padding: "3px 9px", fontSize: 10, fontWeight: 600, background: "var(--info-soft)", color: "var(--info)" }}>
            {CADENCE_LABEL[article.cadence]?.[lang] ?? article.cadence}
          </span>
          {article.audience.map((aud) => (
            <span key={aud} style={{ borderRadius: "var(--r-pill)", padding: "3px 9px", fontSize: 10, fontWeight: 600, background: "var(--bg-2)", color: "var(--fg-3)" }}>
              {aud}
            </span>
          ))}
        </div>
        {article.forms.length > 0 && (
          <p style={{ fontSize: 10.5, color: "var(--fg-4)" }}>
            {t({ fr: "Formulaires : ", en: "Forms: " })}
            <span className="mono" style={{ color: "var(--fg-2)" }}>{article.forms.join(", ")}</span>
          </p>
        )}
      </SidebarBox>

      {article.commonMistakes && article.commonMistakes[lang].length > 0 && (
        <SidebarBox title={t({ fr: "Erreurs fréquentes", en: "Common mistakes" })}>
          <ul style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 14, margin: 0 }}>
            {article.commonMistakes[lang].map((mistake) => (
              <li key={mistake} style={{ fontSize: 11, lineHeight: 1.5, color: "var(--bad)" }}>{mistake}</li>
            ))}
          </ul>
        </SidebarBox>
      )}

      {related.length > 0 && (
        <SidebarBox title={t({ fr: "Articles liés", en: "Related articles" })}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {related.map((rel) => (
              <RelatedArticleCard key={rel.slug} article={rel} />
            ))}
          </div>
        </SidebarBox>
      )}

      {(showTreasuryLink || showReportsLink) && (
        <SidebarBox title={t({ fr: "Voir aussi", en: "See also" })}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {showTreasuryLink && (
              <Link href="/treasury" style={{ fontSize: 11, fontWeight: 600, color: "var(--bronze)", textDecoration: "none" }}>
                {t({ fr: "Voir dans Treasury →", en: "See in Treasury →" })}
              </Link>
            )}
            {showReportsLink && (
              <Link href="/reports" style={{ fontSize: 11, fontWeight: 600, color: "var(--bronze)", textDecoration: "none" }}>
                {t({ fr: "Voir dans Reports →", en: "See in Reports →" })}
              </Link>
            )}
          </div>
        </SidebarBox>
      )}
    </div>
  );
}
