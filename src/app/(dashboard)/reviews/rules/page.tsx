import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

/** Rating rules now live in the Templates tab (small dropdown at the top). */
export default async function ReviewsRulesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  if (session.user?.role !== "owner") redirect("/reviews");
  redirect("/reviews/templates");
}
