import type { TaxArticle } from "./types";

/**
 * Builds an alias → slug lookup from every article's `aliases[]`, sorted longest-first
 * so greedy matching in `linkify()` prefers the most specific alias (e.g. "PND.51"
 * before "PND").
 */
export function buildAliasIndex(articles: TaxArticle[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const article of articles) {
    for (const alias of article.aliases) {
      const key = alias.toLowerCase();
      if (!index.has(key)) index.set(key, article.slug);
    }
  }
  return index;
}

export function sortedAliases(index: Map<string, string>): string[] {
  return Array.from(index.keys()).sort((a, b) => b.length - a.length);
}
