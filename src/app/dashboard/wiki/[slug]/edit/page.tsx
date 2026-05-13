import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolveWikiRole } from "@/lib/wiki-helpers";
import { WikiEditorClient } from "@/modules/wiki/components/WikiEditorClient";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import type { WikiPage, WikiCategory } from "@/modules/wiki/types";

interface Props {
  params: { slug: string };
}

export default async function WikiEditPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const wikiRole = await resolveWikiRole(
    session.user.email,
    session.user.role as "owner" | "staff" | undefined,
  );
  if (wikiRole !== "editor") redirect(`/dashboard/wiki/${params.slug}`);

  const supabase = getSupabaseServerClient();
  const [{ data: pageData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("*, wiki_categories(id, org_id, name, slug, created_at)")
      .eq("org_id", DEFAULT_ORG_ID)
      .eq("slug", params.slug)
      .maybeSingle(),
    supabase
      .from("wiki_categories")
      .select("*")
      .eq("org_id", DEFAULT_ORG_ID)
      .order("name"),
  ]);

  if (!pageData) notFound();

  const page = pageData as unknown as WikiPage & { wiki_categories: WikiCategory | null };
  const categories = (categoriesData ?? []) as WikiCategory[];

  return <WikiEditorClient page={page} categories={categories} mode="edit" />;
}
