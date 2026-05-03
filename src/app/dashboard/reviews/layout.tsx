import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReviewsTabNav } from "@/modules/reviews/components/ReviewsTabNav";

export default async function ReviewsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const role = session.user?.role;

  return (
    <div className="space-y-0">
      <ReviewsTabNav role={role} />
      {children}
    </div>
  );
}
