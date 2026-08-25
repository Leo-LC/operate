import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminTabNav } from "@/modules/admin/components/AdminTabNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!["owner", "admin"].includes(session.user.role ?? "")) redirect("/home");

  const isOwner = session.user.role === "owner";
  return (
    <div className="flex flex-col gap-6">
      <AdminTabNav isOwner={isOwner} />
      {children}
    </div>
  );
}
