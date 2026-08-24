import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminLoyversePanel } from "@/modules/loyverse/components/AdminLoyversePanel";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminLoyversePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/home");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loyverse — Admin"
        subtitle="Activation Phase 4 (OFF par défaut). Réservé owner."
        eyebrow="Admin"
      />
      <AdminLoyversePanel />
    </div>
  );
}
