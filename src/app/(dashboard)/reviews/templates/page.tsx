import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ConfigClient } from "@/components/config-client";

export default async function ReviewsTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  if (session.user?.role !== "owner") redirect("/reviews");

  return <ConfigClient user={session.user ?? null} initialSection="templates" />;
}
