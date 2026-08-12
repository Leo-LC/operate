import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { FinanceTabNav } from "@/modules/finance/components/FinanceTabNav";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role || undefined);
  if (!hasModuleAccess(permissions, "reports")) redirect("/home");
  return <div className="flex flex-col gap-6"><FinanceTabNav />{children}</div>;
}
