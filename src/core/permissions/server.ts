import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole } from "./guards";
import type { ModuleKey, SessionRole, UserPermissions } from "./types";

interface SessionLike {
  user?: {
    userId?: string;
    role?: SessionRole;
  };
}

/**
 * Resolves the effective permissions for a request session.
 *
 * Uses the DB-backed grants (module + location access) whenever the user has a
 * platform user id, falling back to the role-derived defaults for users that
 * are not yet in the `users` table (e.g. the preview/credentials fallbacks).
 *
 * This is the single entry point API routes should use so the sidebar (which
 * reads the same grants via getUserPermissionsFromDb) and the server enforcement
 * can never disagree.
 */
export async function getUserPermissionsFromSession(
  session: SessionLike | null,
): Promise<UserPermissions> {
  return getUserPermissionsFromDb(session?.user?.userId, session?.user?.role);
}

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

    const global_role = user.global_role as "owner" | "admin" | "member" | "reviewer" | "direction";

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

    if (global_role === "direction") {
      return {
        global_role: "direction",
        module_access: [{ module_key: "reports", can_read: true, can_write: false }],
        location_access: [],
        all_locations: true,
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
