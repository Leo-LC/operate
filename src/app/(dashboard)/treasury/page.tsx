import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TreasuryClient } from "@/modules/treasury/components/TreasuryClient";
import "./treasury.css";

export default async function TreasuryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  // Treasury is owner/admin only. When masked via the owner eye-toggle it stays
  // visible (dimmed) to them; every other role is redirected — no extra check.
  if (session.user.role !== "owner" && session.user.role !== "admin") redirect("/home");

  return <TreasuryClient />;
}
