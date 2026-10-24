import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ReviewsStatsClient } from "@/modules/reviews/components/stats/ReviewsStatsClient";

export default async function ReviewsStatsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const role = session.user?.role;
  const isPrivileged = role === "owner" || role === "admin";

  // Nobody should reach this page by URL when the tab is hidden for their role
  // (same trust as the tab nav: the shared visibility table decides).
  let statsVisible: boolean | null = null;
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("reviews_tab_visibility")
      .select("visible")
      .eq("tab_key", "stats")
      .maybeSingle();
    statsVisible = data ? data.visible === true : null;
  } catch {
    // Table not migrated yet → treat as default (visible).
  }
  if (!isPrivileged && statsVisible === false) redirect("/reviews/inbox");

  return <ReviewsStatsClient />;
}
