import "./dashboard.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const email = session.user?.email ?? "unknown";

  return <DashboardShell email={email}>{children}</DashboardShell>;
}
