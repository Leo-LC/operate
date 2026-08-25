import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { hasAllLocationsAccess } from "@/core/permissions/guards";

export async function requireLoyverseOwner(): Promise<
  | { ok: true; email: string }
  | { ok: false; response: Response }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "owner") {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, email: session.user.email ?? "unknown" };
}

/** Any authenticated user can read Loyverse; location filtering is applied at the API layer. */
export async function requireLoyverseAccess(): Promise<
  | { ok: true; email: string; allowedLocationIds: string[] | null; isAllAccess: boolean }
  | { ok: false; response: Response }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role);
  const isAllAccess = hasAllLocationsAccess(permissions);
  const allowedLocationIds = isAllAccess
    ? null
    : permissions.location_access.map((l) => l.location_id);
  return {
    ok: true,
    email: session.user.email ?? "unknown",
    allowedLocationIds,
    isAllAccess,
  };
}
