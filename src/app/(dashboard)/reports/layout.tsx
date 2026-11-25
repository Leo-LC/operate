import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { isAccessibleForSession } from "@/lib/module-visibility";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const [permissions, visible] = await Promise.all([
    getUserPermissionsFromDb(session.user?.userId, session.user?.role),
    // Masked module (owner eye): owner/admin still access it, others are redirected.
    isAccessibleForSession(session.user.role, "module:reports"),
  ]);
  if (!visible || !hasModuleAccess(permissions, "reports")) redirect("/home");
  return <>{children}</>;
}
