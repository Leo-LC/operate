import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoyverseDashboard } from "@/modules/loyverse/components/LoyverseDashboard";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  // Loyverse is now the dashboard for every authenticated user.
  // Location filtering is enforced in /api/loyverse/* via the user's location_access.
  // Only owners can trigger a manual sync (guard still owner-only).
  const canSync = session!.user!.role === "owner";
  return <LoyverseDashboard canSync={canSync} />;
}
