"use client";
import type { TaxArticle } from "../types";
import { useWikiLang } from "./LanguageProvider";
import { ArticleTabs } from "./ArticleTabs";
import { linkify } from "../linkify";

function BulletList({ items, slug }: { items: string[]; slug: string }) {
  const { lang } = useWikiLang();
  return (
    <ul style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 18, margin: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--fg-2)" }}>
          {linkify(item, slug, lang)}
        </li>
      ))}
    </ul>
  );
}

function ExampleBlock({ article }: { article: TaxArticle }) {
  const { lang, t } = useWikiLang();
  return (
    <div style={{ borderRadius: "var(--r-md)", background: "var(--bronze-soft)", padding: 14 }}>
      <p className="eyebrow" style={{ color: "var(--fg-4)", marginBottom: 8 }}>
        {t({ fr: "Exemple concret", en: "Worked example" })}
      </p>
      <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--fg-2)" }}>
        {linkify(article.example[lang], article.slug, lang)}
      </p>
    </div>
  );
}

export function ArticleBody({ article }: { article: TaxArticle }) {
  const { lang } = useWikiLang();

  return (
    <ArticleTabs
      tabs={[
        {
          id: "overview",
          label: { fr: "Overview", en: "Overview" },
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <BulletList items={article.overview[lang]} slug={article.slug} />
              <ExampleBlock article={article} />
            </div>
          ),
        },
        {
          id: "advanced",
          label: { fr: "Détail avancé", en: "Advanced detail" },
          content: <BulletList items={article.details[lang]} slug={article.slug} />,
        },
      ]}
    />
  );
}
