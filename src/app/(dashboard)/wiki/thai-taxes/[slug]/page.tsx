import { notFound, redirect } from "next/navigation";
import { ALL_ARTICLES, getArticle } from "@/modules/wiki/thai-taxes/articles";
import { LEGACY_SLUG_REDIRECTS } from "@/modules/wiki/thai-taxes/legacy-redirects";
import { ArticleHeader } from "@/modules/wiki/thai-taxes/components/ArticleHeader";
import { ArticleBody } from "@/modules/wiki/thai-taxes/components/ArticleBody";
import { QuickFactsSidebar } from "@/modules/wiki/thai-taxes/components/QuickFactsSidebar";

export function generateStaticParams() {
  return ALL_ARTICLES.map((article) => ({ slug: article.slug }));
}

export default async function ThaiTaxArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const article = getArticle(slug);
  if (!article) {
    const canonical = LEGACY_SLUG_REDIRECTS[slug];
    if (canonical) redirect(`/wiki/thai-taxes/${canonical}`);
    notFound();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
        <ArticleHeader article={article} />
        <ArticleBody article={article} />
      </div>
      <div style={{ position: "sticky", top: 24 }}>
        <QuickFactsSidebar article={article} />
      </div>
    </div>
  );
}
