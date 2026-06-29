import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChallengesNav } from "@/modules/challenges/components/ChallengesNav";

export default async function ChallengesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.role === "owner";
  return (
    <div className="flex flex-col gap-0">
      <div className="border-b border-[var(--line)] px-8 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--fg-3)]">Challenges</p>
        <h1 className="mt-0.5 text-xl font-semibold text-[var(--fg)]">Performance</h1>
        <ChallengesNav isOwner={isOwner} />
      </div>
      <div className="px-8 py-6">{children}</div>
    </div>
  );
}
