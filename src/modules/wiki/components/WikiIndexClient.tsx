"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PlusIcon, SearchIcon, BookOpenIcon, ChevronRightIcon, ClockIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { WikiPage, WikiCategory } from "../types";

interface Props {
  pages: (WikiPage & { wiki_categories: WikiCategory | null })[];
  categories: WikiCategory[];
  isEditor: boolean;
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function WikiIndexClient({ pages, categories, isEditor }: Props) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      const matchesSearch = search === "" || p.title.toLowerCase().includes(search.toLowerCase());
      const matchesCat = activeCat === null || p.category_id === activeCat;
      return matchesSearch && matchesCat;
    });
  }, [pages, search, activeCat]);

  const grouped = useMemo(() => {
    const uncategorised: typeof filtered = [];
    const byCat: Record<string, { cat: WikiCategory; pages: typeof filtered }> = {};

    for (const p of filtered) {
      if (!p.category_id || !p.wiki_categories) {
        uncategorised.push(p);
      } else {
        const id = p.category_id;
        if (!byCat[id]) byCat[id] = { cat: p.wiki_categories, pages: [] };
        byCat[id].pages.push(p);
      }
    }

    const sorted = Object.values(byCat).sort((a, b) => a.cat.name.localeCompare(b.cat.name));
    if (uncategorised.length) sorted.push({ cat: { id: "__none", name: "Uncategorised", slug: "", org_id: "", created_at: "" }, pages: uncategorised });
    return sorted;
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Wiki</h1>
          <p className="mt-1 text-sm text-muted-foreground">Internal knowledge base</p>
        </div>
        {isEditor && (
          <Link href="/dashboard/wiki/new" className={buttonVariants({ size: "sm", className: "gap-1.5 shrink-0" })}>
            <PlusIcon className="size-3.5" />
            New page
          </Link>
        )}
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search pages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCat(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCat === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCat === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pages grouped by category */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
          <BookOpenIcon className="size-10 opacity-25" />
          <p className="text-sm">
            {search ? `No pages matching "${search}"` : "No pages yet."}
            {isEditor && !search && (
              <Link href="/dashboard/wiki/new" className="ml-1 text-primary underline-offset-4 hover:underline">
                Create the first one.
              </Link>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ cat, pages: catPages }) => (
            <section key={cat.id}>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#B9854E]">
                  {cat.name}
                </span>
                <div className="h-px flex-1 bg-border opacity-60" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {catPages.map((page) => (
                  <Link
                    key={page.id}
                    href={`/dashboard/wiki/${page.slug}`}
                    className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition-all hover:border-[#B9854E]/40 hover:bg-card/80 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground group-hover:text-[#B9854E] transition-colors">
                        {page.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ClockIcon className="size-3 shrink-0" />
                        <span>{formatRelativeDate(page.updated_at)}</span>
                        <span className="rounded bg-muted px-1.5 py-px text-[10px]">
                          {page.content_type === "html" ? "HTML" : "Rich text"}
                        </span>
                      </div>
                    </div>
                    <ChevronRightIcon className="ml-3 size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
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
