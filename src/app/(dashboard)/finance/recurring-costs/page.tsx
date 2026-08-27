import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { RecurringCostsClient } from "@/modules/finance/components/RecurringCostsClient";

export default async function RecurringCostsPage() {
  const session = await getServerSession(authOptions);
  const permissions = await getUserPermissionsFromDb(session?.user?.userId, session?.user?.role);
  if (!hasModuleAccess(permissions, "reports", true)) redirect("/loyverse");
  return <RecurringCostsClient />;
}