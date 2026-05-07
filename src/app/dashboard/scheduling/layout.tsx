import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";

export default async function SchedulingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const perms = derivePermissionsFromRole(session.user.role || undefined);
  if (!hasModuleAccess(perms, "schedules")) redirect("/dashboard");
  return <>{children}</>;
}
