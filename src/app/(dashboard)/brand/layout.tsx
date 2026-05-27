import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const permissions = await getUserPermissionsFromDb(session.user?.userId, session.user?.role);
  if (!hasModuleAccess(permissions, "brand")) redirect("/home");
  return <>{children}</>;
}
