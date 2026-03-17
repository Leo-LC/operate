import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  return <DashboardClient user={session?.user ?? null} />;
}
