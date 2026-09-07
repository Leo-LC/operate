import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BossClient } from "@/modules/boss/components/BossClient";

export default async function BossPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  // Seul owner/admin peuvent voir cette preview WIP (direction verra loyverse/reports séparés pour l'instant)
  const role = session.user.role ?? "";
  const canSync = ["owner", "admin", "direction"].includes(role);

  return <BossClient canSync={canSync} />;
}
