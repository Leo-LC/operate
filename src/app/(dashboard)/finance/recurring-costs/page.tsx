import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { isAccessibleForSession } from "@/lib/module-visibility";
import { RecurringCostsClient } from "@/modules/finance/components/RecurringCostsClient";

import "../finance.css";

export default async function RecurringCostsPage() {
  const session = await getServerSession(authOptions);
  const permissions = await getUserPermissionsFromDb(session?.user?.userId, session?.user?.role);
  if (!hasModuleAccess(permissions, "reports", true)) redirect("/loyverse");
  // Masked nav item (owner eye): owner/admin still access it, others are redirected.
  if (!(await isAccessibleForSession(session?.user?.role, "module:recurring-costs"))) redirect("/loyverse");
  return <RecurringCostsClient />;
}