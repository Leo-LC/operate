import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DirectionClient } from "@/modules/direction/components/DirectionClient";

export default async function DirectionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  return <DirectionClient />;
}
