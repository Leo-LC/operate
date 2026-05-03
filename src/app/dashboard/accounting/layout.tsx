import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const permissions = derivePermissionsFromRole(session.user.role);
  if (!hasModuleAccess(permissions, "accounting")) redirect("/dashboard");

  return <>{children}</>;
}
