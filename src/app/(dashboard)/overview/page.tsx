import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ViewerDashboard } from "@/modules/overview/components/ViewerDashboard";
import { LoyverseDashboard } from "@/modules/loyverse/components/LoyverseDashboard";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const user = session!.user!;

  const role = user.role;
  if (role === "direction") {
    return <ViewerDashboard name={user.name ?? user.email ?? ""} />;
  }
  if (role !== "owner") redirect("/home");

  return <LoyverseDashboard />;
}
