import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export interface ActivityRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  module_key: string;
  visited_on: string;
  first_seen_at: string;
  last_seen_at: string;
  visit_count: number;
}

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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "admin"].includes(session.user.role ?? "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? "30") || 30, 1), 90);
  const since = bangkokDate(-(days - 1));

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("module_visits")
    .select("id, user_id, module_key, visited_on, first_seen_at, last_seen_at, visit_count, users ( email )")
    .gte("visited_on", since)
    .order("visited_on", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(2000);

  if (error) return Response.json({ error: error.message }, { status: 500 });

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
  const mapped: ActivityRow[] = ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_email: r.users?.email ?? null,
    module_key: r.module_key,
    visited_on: r.visited_on,
    first_seen_at: r.first_seen_at,
    last_seen_at: r.last_seen_at,
    visit_count: r.visit_count,
  }));

  return Response.json(mapped);
}
