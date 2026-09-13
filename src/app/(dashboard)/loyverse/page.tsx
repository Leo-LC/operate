import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { LoyverseDashboard } from "@/modules/loyverse/components/LoyverseDashboard";

export default async function LoyversePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  // Gated by the "loyverse" module like every other module (owner/admin bypass).
  // Grant/revoke per user from the admin panel; reviewers never get it.
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "loyverse")) redirect("/home");

  // Formerly /overview — now /loyverse is the primary dashboard for every user.
  const role = session!.user!.role ?? "";
  const canSync = ["owner", "admin", "direction"].includes(role);
  return <LoyverseDashboard canSync={canSync} />;
}
