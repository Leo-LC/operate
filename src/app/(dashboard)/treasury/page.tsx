import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TreasuryClient } from "@/modules/treasury/components/TreasuryClient";

export default async function TreasuryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/home");

  return <TreasuryClient />;
}
