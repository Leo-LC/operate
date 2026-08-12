import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { hasModuleAccess } from "@/core/permissions/guards";

export async function requireFinanceRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (!hasModuleAccess(permissions, "reports")) return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { session, permissions };
}

export async function requireFinanceOwner() {
  const auth = await requireFinanceRead();
  if (auth.error) return auth;
  if (auth.permissions.global_role !== "owner") return { error: Response.json({ error: "Owner access required" }, { status: 403 }) };
  return auth;
}
