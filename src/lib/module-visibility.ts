import { getSupabaseServerClient } from "@/lib/supabase-server";

/** Modules gated by the global release flag (hidden from non-owners until released). */
export const GATED_MODULES = ["attendance", "schedules", "treasury"] as const;
export type GatedModule = (typeof GATED_MODULES)[number];

export const DEFAULT_MODULE_VISIBILITY: Record<GatedModule, boolean> = {
  attendance: false,
  schedules: false,
  treasury: false,
};

function isGatedModule(key: string): key is GatedModule {
  return (GATED_MODULES as readonly string[]).includes(key);
}

/** Server-side read of the global release flags. Falls back to masked (false) on any error. */
export async function getModuleVisibility(): Promise<Record<GatedModule, boolean>> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("module_visibility").select("module_key, visible");
    if (error) return { ...DEFAULT_MODULE_VISIBILITY };
    const merged = { ...DEFAULT_MODULE_VISIBILITY };
    for (const row of data ?? []) {
      if (isGatedModule(row.module_key)) merged[row.module_key] = !!row.visible;
    }
    return merged;
  } catch {
    return { ...DEFAULT_MODULE_VISIBILITY };
  }
}
