import "./challenges.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChallengesNav } from "@/modules/challenges/components/ChallengesNav";

export default async function ChallengesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.role === "owner";
  return (
    <div className="challenges">
      <ChallengesNav isOwner={isOwner} />
      {children}
    </div>
  );
}
