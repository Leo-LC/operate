import Link from "next/link";
import { BookOpenIcon, ChevronRightIcon, ClockIcon } from "lucide-react";
import { WIKI_ARTICLES, WIKI_CATEGORIES } from "@/modules/wiki/registry";

const FRENCH_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${FRENCH_MONTHS[month - 1]} ${year}`;
}

export default function WikiIndexPage() {
  const grouped = WIKI_CATEGORIES.map((category) => ({
    category,
    articles: WIKI_ARTICLES.filter((a) => a.category === category),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2F2823]">Wiki</h1>
        <p className="mt-1 text-sm text-[#7a6a5a]">Base de connaissances interne</p>
      </div>

      {/* Article groups */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#7a6a5a]">
          <BookOpenIcon className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">Aucun article disponible pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, articles }) => (
            <section key={category}>
              {/* Category header */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#B9854E]">
                  {category}
                </span>
                <span className="h-px flex-1 bg-border opacity-60" />
              </div>

              {/* Article grid */}
              <div className="grid gap-2 sm:grid-cols-2">
                {articles.map((article) => (
                  <Link
                    key={article.slug}
                    href={article.href}
                    className="group flex items-start justify-between rounded-lg border border-[#E8DDD0] bg-[#F7F2E9] p-4 transition-all hover:border-[#B9854E]/40 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#2F2823] leading-snug">
                        {article.title}
                      </p>
                      <p className="mt-1 text-xs text-[#7a6a5a] leading-relaxed line-clamp-2">
                        {article.description}
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-[10px] text-[#7a6a5a]">
                        <ClockIcon className="h-3 w-3 shrink-0" />
                        <span>{formatDate(article.updatedAt)}</span>
                      </div>
                    </div>
                    <ChevronRightIcon className="ml-3 mt-0.5 h-4 w-4 shrink-0 text-[#7a6a5a] opacity-50 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
