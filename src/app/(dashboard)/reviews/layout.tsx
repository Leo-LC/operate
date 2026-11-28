import "./reviews.css";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { isAccessibleForSession } from "@/lib/module-visibility";
import { ReviewsTabNav } from "@/modules/reviews/components/ReviewsTabNav";

export default async function ReviewsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  const [permissions, visible] = await Promise.all([
    getUserPermissionsFromDb(session.user?.userId, session.user?.role),
    // Masked module (owner eye): owner/admin still access it, others are redirected.
    isAccessibleForSession(session.user.role, "module:reviews"),
  ]);
  // Module grant + eye mask (matches the sidebar filter, also for direct URL access).
  if (!visible || !hasModuleAccess(permissions, "reviews")) redirect("/home");

  const role = session.user?.role;

  return (
    <div className="revs">
      <ReviewsTabNav role={role} />
      {children}
    </div>
  );
}
