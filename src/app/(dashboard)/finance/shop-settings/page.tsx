import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { ShopSettingsClient } from "@/modules/finance/components/ShopSettingsClient";

export default async function ShopSettingsPage() {
  const session = await getServerSession(authOptions);
  const permissions = await getUserPermissionsFromDb(session?.user?.userId, session?.user?.role);
  if (!hasModuleAccess(permissions, "reports", true)) redirect("/overview");
  return <ShopSettingsClient />;
}