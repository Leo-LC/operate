"use client";
import Link from "next/link";
import { BookOpenIcon, ChevronRightIcon, ClockIcon } from "lucide-react";
import { WIKI_ARTICLES, WIKI_CATEGORIES } from "@/modules/wiki/registry";

const FRENCH_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDate(iso: string): string {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return iso;
  const [year, month, day] = parts;
  return `${day} ${FRENCH_MONTHS[month - 1] ?? iso} ${year}`;
}

export default function WikiIndexPage() {
  const grouped = WIKI_CATEGORIES.map((category) => ({
    category,
    articles: WIKI_ARTICLES.filter((a) => a.category === category),
  }));

  return (
    <div style={{ maxWidth: 860, padding: "0" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em" }}>Wiki</h1>
        <p style={{ marginTop: 4, fontSize: 13, color: "var(--fg-3)" }}>Base de connaissances interne</p>
      </div>

      {/* Article groups */}
      {grouped.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "var(--fg-4)" }}>
          <BookOpenIcon style={{ marginBottom: 12, width: 40, height: 40, opacity: 0.4 }} />
          <p style={{ fontSize: 13 }}>Aucun article disponible pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {grouped.map(({ category, articles }) => (
            <section key={category}>
              {/* Category header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span className="eyebrow" style={{ color: "var(--bronze)" }}>{category}</span>
                <span style={{ height: 1, flex: 1, background: "var(--line)" }} />
              </div>

              {/* Article grid */}
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, 1fr)" }}>
                {articles.map((article) => (
                  <WikiArticleCard key={article.slug} article={article} formatDate={formatDate} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function WikiArticleCard({ article, formatDate }: { article: (typeof WIKI_ARTICLES)[number]; formatDate: (d: string) => string }) {
  return (
    <Link
      href={article.href}
      aria-label={article.title}
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
          {article.title}
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {article.description}
        </p>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--fg-4)" }}>
          <ClockIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
          <span>{formatDate(article.updatedAt)}</span>
        </div>
      </div>
      <ChevronRightIcon style={{ marginLeft: 12, marginTop: 2, width: 16, height: 16, flexShrink: 0, color: "var(--fg-4)" }} />
    </Link>
  );
}
