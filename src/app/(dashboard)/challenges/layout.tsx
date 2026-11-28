import "./challenges.css";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { isAccessibleForSession } from "@/lib/module-visibility";
import { ChallengesNav } from "@/modules/challenges/components/ChallengesNav";

export default async function ChallengesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const [permissions, visible] = await Promise.all([
    getUserPermissionsFromDb(session.user?.userId, session.user?.role),
    // Masked module (owner eye): owner/admin still access it, others are redirected.
    isAccessibleForSession(session.user.role, "module:challenges"),
  ]);
  // Module grant + eye mask (matches the sidebar filter, also for direct URL access).
  if (!visible || !hasModuleAccess(permissions, "challenges")) redirect("/home");
  const isOwner = session.user.role === "owner";
  return (
    <div className="challenges">
      <ChallengesNav isOwner={isOwner} />
      {children}
    </div>
  );
}
