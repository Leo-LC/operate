import { Fragment, ReactNode } from "react";
import { WikiLink } from "./components/WikiLink";
import { buildAliasIndex, sortedAliases } from "./aliases";
import { ALL_ARTICLES, getArticle } from "./articles";
import type { WikiLang } from "./components/LanguageProvider";

const ALIAS_INDEX = buildAliasIndex(ALL_ARTICLES);
const SORTED_ALIASES = sortedAliases(ALIAS_INDEX);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALIAS_PATTERN =
  SORTED_ALIASES.length > 0
    ? new RegExp(`(${SORTED_ALIASES.map(escapeRegExp).join("|")})`, "gi")
    : null;

/**
 * Turns any recognized tax-term alias in `text` (e.g. "PND.50", "SSF", "TVA") into a
 * <WikiLink> pointing at the matching article, skipping self-links to `currentSlug`.
 */
export function linkify(text: string, currentSlug: string, lang: WikiLang): ReactNode {
  if (!ALIAS_PATTERN) return text;

  const parts = text.split(ALIAS_PATTERN);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    const slug = ALIAS_INDEX.get(part.toLowerCase());
    if (!slug || slug === currentSlug) {
      return <Fragment key={i}>{part}</Fragment>;
    }
    const target = getArticle(slug);
    return (
      <WikiLink key={i} slug={slug} title={target ? target.title[lang] : undefined}>
        {part}
      </WikiLink>
    );
  });
}
