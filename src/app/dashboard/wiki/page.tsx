import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolveWikiRole } from "@/lib/wiki-helpers";
import { WikiIndexClient } from "@/modules/wiki/components/WikiIndexClient";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import type { WikiPage, WikiCategory } from "@/modules/wiki/types";

export default async function WikiIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const supabase = getSupabaseServerClient();
  const [{ data: pagesData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("id, org_id, title, slug, content_type, category_id, created_by, updated_by, created_at, updated_at, wiki_categories(id, org_id, name, slug, created_at)")
      .eq("org_id", DEFAULT_ORG_ID)
      .order("title", { ascending: true }),
    supabase
      .from("wiki_categories")
      .select("*")
      .eq("org_id", DEFAULT_ORG_ID)
      .order("name", { ascending: true }),
  ]);

  const wikiRole = await resolveWikiRole(
    session.user.email,
    session.user.role as "owner" | "staff" | undefined,
  );

  const pages = (pagesData ?? []) as unknown as (WikiPage & { wiki_categories: WikiCategory | null })[];
  const categories = (categoriesData ?? []) as WikiCategory[];

  return (
    <WikiIndexClient
      pages={pages}
      categories={categories}
      isEditor={wikiRole === "editor"}
    />
  );
}
