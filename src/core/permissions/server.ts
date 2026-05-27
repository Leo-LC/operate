import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole } from "./guards";
import type { ModuleKey, UserPermissions } from "./types";

export async function getUserPermissionsFromDb(
  userId: string | undefined,
  fallbackRole: "owner" | "staff" | undefined,
): Promise<UserPermissions> {
  if (!userId) return derivePermissionsFromRole(fallbackRole);

  try {
    const supabase = getSupabaseServerClient();

    const { data: user } = await supabase
      .from("users")
      .select("global_role")
      .eq("id", userId)
      .single();

    if (!user) return derivePermissionsFromRole(fallbackRole);

    const global_role = user.global_role as "owner" | "admin" | "member";

    if (global_role === "owner") {
      return { global_role: "owner", module_access: [], location_access: [], all_locations: true };
    }

    const [{ data: moduleRows }, { data: locationRows }] = await Promise.all([
      supabase.from("user_module_access").select("module_key, can_read, can_write").eq("user_id", userId),
      supabase.from("user_location_access").select("location_id").eq("user_id", userId),
    ]);

    return {
      global_role: global_role === "admin" ? "admin" : "member",
      module_access: (moduleRows ?? []).map((m) => ({
        module_key: m.module_key as ModuleKey,
        can_read: m.can_read as boolean,
        can_write: m.can_write as boolean,
      })),
      location_access: (locationRows ?? []).map((l) => ({ location_id: l.location_id as string })),
      all_locations: false,
    };
  } catch {
    return derivePermissionsFromRole(fallbackRole);
  }
}

/**
 * Returns null if the user can see all locations, or a string[] of allowed
 * location IDs. An empty array means no locations are accessible.
 */
export async function getAllowedLocationIds(
  userId: string | undefined,
  isOwner: boolean,
): Promise<string[] | null> {
  if (isOwner || !userId) return null;
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("user_location_access")
      .select("location_id")
      .eq("user_id", userId);
    return (data ?? []).map((r) => r.location_id as string);
  } catch {
    return null;
  }
}
