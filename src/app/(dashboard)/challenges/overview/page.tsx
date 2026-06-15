import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChallengesOverview } from "@/modules/challenges/components/ChallengesOverview";

export const metadata = { title: "Overview — Challenges" };

export default async function ChallengesOverviewPage() {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.role === "owner";
  return <ChallengesOverview isOwner={isOwner} />;
}
