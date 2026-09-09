import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DirectionClient } from "@/modules/direction/components/DirectionClient";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { hasModuleAccess } from "@/core/permissions/guards";

export default async function DirectionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const role = session.user.role ?? "";
  const perms = await getUserPermissionsFromSession(session);
  // Direction page is gated by the "direction" module (owner/admin bypass via hasModuleAccess)
  if (!hasModuleAccess(perms, "direction")) redirect("/home");

  const canSync = ["owner", "admin", "direction"].includes(role);

  return <DirectionClient canSync={canSync} userRole={role} />;
}
