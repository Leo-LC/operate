import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess, isOperationalAdmin } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { isAccessibleForSession } from "@/lib/module-visibility";
import { SchedulingTabNav } from "@/modules/scheduling/components/SchedulingTabNav";
import "./scheduling.css";

export default async function SchedulingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const [permissions, visible] = await Promise.all([
    getUserPermissionsFromDb(session.user?.userId, session.user?.role),
    // Masked module (owner eye): owner/admin still access it, others are redirected.
    isAccessibleForSession(session.user.role, "module:scheduling"),
  ]);
  if (!visible || !hasModuleAccess(permissions, "schedules")) redirect("/home");
  return (
    <div className="sch">
      <SchedulingTabNav isOwner={isOperationalAdmin(session.user.role)} />
      {children}
    </div>
  );
}
