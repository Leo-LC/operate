import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess, isOperationalAdmin } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { getModuleVisibility } from "@/lib/module-visibility";
import { SchedulingTabNav } from "@/modules/scheduling/components/SchedulingTabNav";
import "./scheduling.css";

export default async function SchedulingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role === "owner") {
    return (
      <div className="sch">
        <SchedulingTabNav isOwner />
        {children}
      </div>
    );
  }
  const [permissions, visibility] = await Promise.all([
    getUserPermissionsFromDb(session.user?.userId, session.user?.role),
    getModuleVisibility(),
  ]);
  if (!visibility.schedules || !hasModuleAccess(permissions, "schedules")) redirect("/home");
  return (
    <div className="sch">
      <SchedulingTabNav isOwner={isOperationalAdmin(session.user.role)} />
      {children}
    </div>
  );
}
