export interface ArticleMeta {
  slug: string;
  href: string;
  title: string;
  description: string;
  category: string;
  updatedAt: string;
  type: "rich" | "prose";
}

export const WIKI_ARTICLES: ArticleMeta[] = [
  {
    slug: "thai-taxes",
    href: "/dashboard/wiki/thai-taxes",
    title: "Comptabilité & Taxes en Thaïlande",
    description:
      "Vue d'ensemble complète de la fiscalité thaïlandaise : VAT, retenues à la source, impôt sur les sociétés, charges sociales, dividendes et calendrier des déclarations.",
    category: "Comptabilité & Fiscalité",
    updatedAt: "2026-05-21",
    type: "rich",
  },
];

export const WIKI_CATEGORIES: string[] = Array.from(
  new Set(WIKI_ARTICLES.map((a) => a.category)),
).sort();
