import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Unified UI visibility ("eye") gating.
 *
 * One row per maskable UI element in the `module_visibility` table:
 *   - `module:<nav-item-id>`   → a sidebar entry (and its route)
 *   - `tab:<module>.<tab-key>` → a tab in a module tab bar
 *
 * Semantics:
 *   - no row (or read error) → visible to everyone with role access;
 *   - `visible = false` → masked: hidden for member/reviewer/direction/staff,
 *     still visible (dimmed) to owner/admin — the owner's "dev mode".
 * Only owners can toggle; the eye icon lives in the sidebar and tab bars.
 */
export type VisibilityKey = string;

const VISIBILITY_KEY_RE = /^(module|tab):[a-z0-9][a-z0-9._-]*$/i;

export function isValidVisibilityKey(key: string): boolean {
  return VISIBILITY_KEY_RE.test(key);
}

/** Server-side read of every visibility flag. Absent keys are treated as visible. */
export async function getUiVisibility(): Promise<Record<string, boolean>> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("module_visibility").select("module_key, visible");
    if (error) return {};
    const map: Record<string, boolean> = {};
    for (const row of data ?? []) map[row.module_key] = !!row.visible;
    return map;
  } catch {
    return {};
  }
}

/** False only when the element is explicitly masked. */
export async function isUiVisible(key: VisibilityKey): Promise<boolean> {
  if (!isValidVisibilityKey(key)) return true;
  const map = await getUiVisibility();
  return map[key] !== false;
}

/**
 * Server-side gate for layouts/pages: owner/admin always pass (they see masked
 * elements dimmed); everyone else only when the element is not masked.
 * Combine with hasModuleAccess() for the role/module grant.
 */
export async function isAccessibleForSession(
  role: string | null | undefined,
  key: VisibilityKey
): Promise<boolean> {
  if (role === "owner" || role === "admin") return true;
  return isUiVisible(key);
}
