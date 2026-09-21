import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChallengesNav } from "@/modules/challenges/components/ChallengesNav";

export default async function ChallengesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.role === "owner";
  return (
    <div className="flex flex-col gap-0">
      <div className="px-8 pt-2">
        <ChallengesNav isOwner={isOwner} />
      </div>
      <div className="px-8 py-6">{children}</div>
    </div>
  );
}
