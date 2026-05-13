import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { resolveWikiRole } from "@/lib/wiki-helpers";
import { WikiEditorClient } from "@/modules/wiki/components/WikiEditorClient";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import type { WikiCategory } from "@/modules/wiki/types";

export default async function WikiNewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const wikiRole = await resolveWikiRole(
    session.user.email,
    session.user.role as "owner" | "staff" | undefined,
  );
  if (wikiRole !== "editor") redirect("/dashboard/wiki");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("wiki_categories")
    .select("*")
    .eq("org_id", DEFAULT_ORG_ID)
    .order("name");

  const categories = (data ?? []) as WikiCategory[];

  return <WikiEditorClient categories={categories} mode="create" />;
}
