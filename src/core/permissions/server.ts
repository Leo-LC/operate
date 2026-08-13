import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole } from "./guards";
import type { ModuleKey, SessionRole, UserPermissions } from "./types";

export async function getUserPermissionsFromDb(
  userId: string | undefined,
  fallbackRole: SessionRole | undefined,
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

    const global_role = user.global_role as "owner" | "admin" | "member" | "reviewer";

    if (global_role === "owner" || global_role === "admin") {
      return { global_role, module_access: [], location_access: [], all_locations: true };
    }

    if (global_role === "reviewer") {
      const { data: locationRows } = await supabase
        .from("user_location_access")
        .select("location_id")
        .eq("user_id", userId);
      return {
        global_role: "reviewer",
        module_access: [{ module_key: "reviews", can_read: true, can_write: true }],
        location_access: (locationRows ?? []).map((l) => ({ location_id: l.location_id as string })),
        all_locations: false,
      };
    }

    const [{ data: moduleRows }, { data: locationRows }] = await Promise.all([
      supabase.from("user_module_access").select("module_key, can_read, can_write").eq("user_id", userId),
      supabase.from("user_location_access").select("location_id").eq("user_id", userId),
    ]);

    return {
      global_role: "member",
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
