import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireLoyverseSandboxPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/home");
  return session;
}
