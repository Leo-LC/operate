import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ConfigClient } from "@/components/config-client";

export default async function TemplatesConfigPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  if ((session.user as any).role !== "owner") {
    redirect("/dashboard");
  }

  return <ConfigClient user={session.user ?? null} initialSection="templates" />;
}

