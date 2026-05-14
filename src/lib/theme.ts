import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { type AppTheme } from "@/lib/theme-config";

export type { AppTheme } from "@/lib/theme-config";

export const getOrgTheme = cache(async (): Promise<AppTheme> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("app_settings")
      .select("theme")
      .eq("organization_id", DEFAULT_ORG_ID)
      .single();
    const theme = data?.theme;
    if (theme === "capybara" || theme === "forest") return theme;
    return "capybara";
  } catch {
    return "capybara";
  }
});

export async function setOrgTheme(theme: AppTheme): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { organization_id: DEFAULT_ORG_ID, theme, updated_at: new Date().toISOString() },
      { onConflict: "organization_id" },
    );
  if (error) throw new Error(error.message);
}
