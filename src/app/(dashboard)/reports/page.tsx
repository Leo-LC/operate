import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ReportsClient } from "@/modules/reports/components/ReportsClient";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  return <ReportsClient />;
}
