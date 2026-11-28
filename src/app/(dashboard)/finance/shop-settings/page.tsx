import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { isAccessibleForSession } from "@/lib/module-visibility";
import { ShopSettingsClient } from "@/modules/finance/components/ShopSettingsClient";

import "../finance.css";

export default async function ShopSettingsPage() {
  const session = await getServerSession(authOptions);
  const permissions = await getUserPermissionsFromDb(session?.user?.userId, session?.user?.role);
  if (!hasModuleAccess(permissions, "reports", true)) redirect("/loyverse");
  // Masked nav item (owner eye): owner/admin still access it, others are redirected.
  if (!(await isAccessibleForSession(session?.user?.role, "module:shop-settings"))) redirect("/loyverse");
  return <ShopSettingsClient />;
}