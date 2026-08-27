import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoyverseModuleClient } from "@/modules/loyverse/components/LoyverseModuleClient";

export default async function LoyversePreviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/loyverse");
  return <LoyverseModuleClient />;
}
