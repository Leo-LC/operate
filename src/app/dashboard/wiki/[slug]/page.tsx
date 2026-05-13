import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolveWikiRole } from "@/lib/wiki-helpers";
import { WikiPageClient } from "@/modules/wiki/components/WikiPageClient";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import type { WikiPage, WikiCategory } from "@/modules/wiki/types";

interface Props {
  params: { slug: string };
}

export default async function WikiSlugPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("wiki_pages")
    .select("*, wiki_categories(id, org_id, name, slug, created_at)")
    .eq("org_id", DEFAULT_ORG_ID)
    .eq("slug", params.slug)
    .maybeSingle();

  if (error || !data) notFound();

  const wikiRole = await resolveWikiRole(
    session.user.email,
    session.user.role as "owner" | "staff" | undefined,
  );

  const page = data as unknown as WikiPage & { wiki_categories: WikiCategory | null };

  return (
    <WikiPageClient
      page={page}
      sanitizedContent={page.content ?? ""}
      isEditor={wikiRole === "editor"}
    />
  );
}
