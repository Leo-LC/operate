import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { LoyverseModuleClient } from "@/modules/loyverse/components/LoyverseModuleClient";

export default async function LoyversePreviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const perms = await getUserPermissionsFromDb(session!.user!.userId, session!.user!.role);
  const canAccess = perms.global_role === "owner" || perms.global_role === "admin" || hasModuleAccess(perms, "loyverse_preview");
  if (!canAccess) redirect("/loyverse");
  return <LoyverseModuleClient />;
}
