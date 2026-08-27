import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoyverseDashboard } from "@/modules/loyverse/components/LoyverseDashboard";

export default async function LoyversePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  // Formerly /overview — now /loyverse is the primary dashboard for every user.
  const role = session!.user!.role ?? "";
  const canSync = ["owner", "admin", "direction"].includes(role);
  return <LoyverseDashboard canSync={canSync} />;
}
