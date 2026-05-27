import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ConfigClient } from "@/components/config-client";

export default async function ReviewsLocationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return <ConfigClient user={session.user ?? null} initialSection="locations" />;
}
