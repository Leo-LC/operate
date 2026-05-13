import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolveWikiRole } from "@/lib/wiki-helpers";
import { WikiPageClient } from "@/modules/wiki/components/WikiPageClient";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import DOMPurify from "isomorphic-dompurify";
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

  // Sanitize richtext content server-side before passing to client
  const sanitizedContent =
    page.content_type === "richtext" && page.content
      ? DOMPurify.sanitize(page.content, {
          ALLOWED_TAGS: [
            "p", "br", "b", "strong", "i", "em", "u", "s", "a", "ul", "ol", "li",
            "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
            "hr", "table", "thead", "tbody", "tr", "th", "td", "img", "span", "div",
          ],
          ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style"],
        })
      : "";

  return (
    <WikiPageClient
      page={page}
      sanitizedContent={sanitizedContent}
      isEditor={wikiRole === "editor"}
    />
  );
}
