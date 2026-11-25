import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAccessibleForSession } from "@/lib/module-visibility";
import { ReviewsTabNav } from "@/modules/reviews/components/ReviewsTabNav";

export default async function ReviewsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  // Masked module (owner eye): owner/admin still access it, others are redirected.
  if (!(await isAccessibleForSession(session.user.role, "module:reviews"))) redirect("/home");

  const role = session.user?.role;

  return (
    <div>
      <ReviewsTabNav role={role} />
      {children}
    </div>
  );
}
