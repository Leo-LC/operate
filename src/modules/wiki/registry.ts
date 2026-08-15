export interface ArticleMeta {
  slug: string;
  href: string;
  title: string;
  description: string;
  category: string;
  /** ISO date string in YYYY-MM-DD format */
  updatedAt: string;
  type: "rich" | "prose";
}

export const WIKI_ARTICLES: ArticleMeta[] = [
  {
    slug: "thai-taxes",
    href: "/wiki/thai-taxes",
    title: "Accounting & Taxes in Thailand",
    description:
      "A complete overview of Thai taxation: VAT, withholding tax, corporate income tax, social contributions, dividends and the filing calendar.",
    category: "Accounting & Tax",
    updatedAt: "2026-07-29",
    type: "rich",
  },
];

export const WIKI_CATEGORIES: string[] = Array.from(
  new Set(WIKI_ARTICLES.map((a) => a.category)),
).sort();
