import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { LoginCard } from "@/components/login-card";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    const permissions = await getUserPermissionsFromDb(session.user?.userId, session.user?.role);
    if (permissions.global_role === "direction") redirect("/direction");
    if (permissions.global_role === "reviewer") redirect("/reviews");
    redirect("/loyverse");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-[360px] flex-col gap-8">
        <h1 className="text-center font-serif text-[32px] font-normal tracking-tight text-foreground">Operate</h1>
        <LoginCard />
      </div>
    </div>
  );
}
