import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrgTheme } from "@/lib/theme";
import { AppearanceClient } from "@/modules/admin/components/AppearanceClient";

export default async function AdminAppearancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const theme = await getOrgTheme();

  return <AppearanceClient currentTheme={theme} />;
}
