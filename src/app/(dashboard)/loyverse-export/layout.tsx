import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";

export default async function LoyverseExportLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const permissions = await getUserPermissionsFromDb(session.user?.userId, session.user?.role);
  // Reuses the accounting permission — no new ModuleKey, no migration.
  if (!hasModuleAccess(permissions, "accounting")) redirect("/home");
  return <>{children}</>;
}
