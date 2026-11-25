import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAccessibleForSession } from "@/lib/module-visibility";
import { ChallengesNav } from "@/modules/challenges/components/ChallengesNav";

export default async function ChallengesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  // Masked module (owner eye): owner/admin still access it, others are redirected.
  if (!(await isAccessibleForSession(session?.user?.role, "module:challenges"))) redirect("/home");
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
