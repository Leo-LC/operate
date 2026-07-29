"use client";
import Link from "next/link";
import type { TaxArticle } from "../types";
import { useWikiLang } from "./LanguageProvider";

export function RelatedArticleCard({ article }: { article: TaxArticle }) {
  const { lang } = useWikiLang();
  const disabled = article.status !== "active";

  const content = (
    <>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {article.title[lang]}
      </span>
      <span aria-hidden="true" style={{ color: disabled ? "var(--fg-4)" : "var(--bronze)" }}>→</span>
    </>
  );

  const sharedStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: "var(--r-md)",
    border: "1px solid var(--line)",
    background: "var(--surface)",
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: disabled ? "var(--fg-4)" : "var(--fg)",
    textDecoration: "none",
  };

  if (disabled) {
    return <div style={sharedStyle}>{content}</div>;
  }

  return (
    <Link
      href={`/wiki/thai-taxes/${article.slug}`}
      style={sharedStyle}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--bronze)"; e.currentTarget.style.color = "var(--bronze)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--fg)"; }}
    >
      {content}
    </Link>
  );
}
