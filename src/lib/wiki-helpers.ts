import { getSupabaseServerClient } from "./supabase-server";
import { DEFAULT_ORG_ID } from "./constants";
import type { WikiRole } from "@/modules/wiki/types";

/** Resolves the wiki role for a given user and configures RLS session variables. */
export async function resolveWikiRole(
  email: string,
  globalRole: "owner" | "staff" | undefined,
): Promise<WikiRole> {
  // Owners are always editors
  if (globalRole === "owner") return "editor";

  // Check wiki_roles table for an explicit override
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("wiki_roles")
    .select("role")
    .eq("org_id", DEFAULT_ORG_ID)
    .eq("user_email", email)
    .maybeSingle();

  if (data?.role === "editor") return "editor";

  // Default: staff are viewers
  return "viewer";
}

/** Sets RLS session variables so DB policies can enforce access. */
export async function setWikiRlsContext(wikiRole: WikiRole): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.rpc("set_config", {
    key: "app.org_id",
    value: DEFAULT_ORG_ID,
    is_local: true,
  } as never);
  await supabase.rpc("set_config", {
    key: "app.wiki_role",
    value: wikiRole,
    is_local: true,
  } as never);
}
