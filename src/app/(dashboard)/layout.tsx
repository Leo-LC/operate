import "./dashboard.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { getUiVisibility } from "@/lib/module-visibility";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const email = session.user?.email ?? "unknown";
  const [permissions, visibility] = await Promise.all([
    getUserPermissionsFromDb(session.user?.userId, session.user?.role),
    // Eye masks are resolved server-side so the first paint already honors
    // them — masked tabs never flash visible while the client fetch runs.
    getUiVisibility(),
  ]);

  return (
    <DashboardShell email={email} permissions={permissions} initialVisibility={visibility}>
      {children}
    </DashboardShell>
  );
}
