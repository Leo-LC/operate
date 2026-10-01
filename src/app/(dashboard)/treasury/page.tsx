import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TreasuryClient } from "@/modules/treasury/components/TreasuryClient";
import { getModuleVisibility } from "@/lib/module-visibility";

export default async function TreasuryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role === "owner") return <TreasuryClient />;
  // Released to admins only via the owner eye-toggle; masked globally otherwise.
  if (session.user.role !== "admin") redirect("/home");
  const visibility = await getModuleVisibility();
  if (!visibility.treasury) redirect("/home");

  return <TreasuryClient />;
}
