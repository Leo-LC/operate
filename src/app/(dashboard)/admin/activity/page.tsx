import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ActivityClient } from "@/modules/admin/components/ActivityClient";
import type { ActivityRow } from "@/app/api/admin/activity/route";

function bangkokDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export default async function AdminActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!["owner", "admin"].includes(session.user.role ?? "")) redirect("/home");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("module_visits")
    .select("id, user_id, module_key, visited_on, first_seen_at, last_seen_at, visit_count, users ( email )")
    .gte("visited_on", bangkokDate(-29))
    .order("visited_on", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(2000);

  type Row = {
    id: string;
    user_id: string | null;
    module_key: string;
    visited_on: string;
    first_seen_at: string;
    last_seen_at: string;
    visit_count: number;
    users: { email: string } | null;
  };
  const rows: ActivityRow[] = ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_email: r.users?.email ?? null,
    module_key: r.module_key,
    visited_on: r.visited_on,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    visit_count: r.visit_count,
  }));

  return <ActivityClient rows={rows} />;
}
