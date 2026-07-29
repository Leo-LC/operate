import type { TaxArticle } from "../types";
import { BASES_ARTICLES } from "./bases";
import { VAT_ARTICLES } from "./vat";
import { WHT_ARTICLES } from "./wht";
import { CIT_ARTICLES } from "./cit";
import { PAYROLL_ARTICLES } from "./payroll";
import { DIVIDENDS_ARTICLES } from "./dividends";
import { CALENDAR_TREASURY_ARTICLES } from "./calendar-treasury";
import { PERSONAL_ARTICLES } from "./personal";

export const ALL_ARTICLES: TaxArticle[] = [
  ...BASES_ARTICLES,
  ...VAT_ARTICLES,
  ...WHT_ARTICLES,
  ...CIT_ARTICLES,
  ...PAYROLL_ARTICLES,
  ...DIVIDENDS_ARTICLES,
  ...CALENDAR_TREASURY_ARTICLES,
  ...PERSONAL_ARTICLES,
];

export function getArticle(slug: string): TaxArticle | undefined {
  return ALL_ARTICLES.find((a) => a.slug === slug);
}

/**
 * Dev-time invariant check, run once at module load. Throws in non-production so
 * content mistakes (the exact class of bug that made "PME — Taux progressifs" open
 * the CIT page instead of its own article) fail loudly instead of shipping silently.
 */
function validateArticles(articles: TaxArticle[]) {
  const bySlug = new Map(articles.map((a) => [a.slug, a]));

  const seen = new Set<string>();
  for (const a of articles) {
    if (seen.has(a.slug)) {
      throw new Error(`[wiki/thai-taxes] Duplicate article slug: "${a.slug}"`);
    }
    seen.add(a.slug);
  }

  for (const a of articles) {
    const refs: [string, string[]][] = [
      ["relatedArticles", a.relatedArticles],
      ["prerequisites", a.prerequisites],
      ["nextArticles", a.nextArticles],
    ];
    for (const [field, slugs] of refs) {
      for (const slug of slugs) {
        if (!bySlug.has(slug)) {
          throw new Error(
            `[wiki/thai-taxes] Article "${a.slug}" has ${field} referencing unknown slug "${slug}"`,
          );
        }
        if (slug === a.slug) {
          throw new Error(`[wiki/thai-taxes] Article "${a.slug}" lists itself in ${field}`);
        }
      }
    }
  }
}

if (process.env.NODE_ENV !== "production") {
  validateArticles(ALL_ARTICLES);
}
