import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const KNOWN_MODULES = new Set([
  "reviews",
  "challenges",
  "documents",
  "animals",
  "schedules",
  "accounting",
  "reports",
  "contacts",
  "attendance",
  "payments",
  "admin",
  "wiki",
  "brand",
  "loyverse",
  "loyverse_preview",
  "direction",
  "treasury",
  "loyverse-sandbox",
  "customer-insights",
]);

function bangkokDate(): string {
  // YYYY-MM-DD in Asia/Bangkok so "today" matches shop time, not UTC.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ ok: false }, { status: 401 });

  let moduleKey: string | null = null;
  try {
    const body = (await request.json()) as { module_key?: unknown };
    if (typeof body.module_key === "string") moduleKey = body.module_key;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!moduleKey || !KNOWN_MODULES.has(moduleKey)) {
    // Unknown paths (e.g. /home) are simply not tracked — not an error.
    return Response.json({ ok: true, tracked: false });
  }

  const supabase = getSupabaseServerClient();
  let userId = session.user.userId ?? null;
  if (!userId && session.user.email) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email.toLowerCase())
      .single();
    userId = (data as { id?: string } | null)?.id ?? null;
  }
  if (!userId) return Response.json({ ok: true, tracked: false });

  const visitedOn = bangkokDate();

  // One row per (user, module, day): insert, otherwise bump last_seen_at + counter.
  const { data: existing } = await supabase
    .from("module_visits")
    .select("id, visit_count")
    .eq("user_id", userId)
    .eq("module_key", moduleKey)
    .eq("visited_on", visitedOn)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; visit_count: number };
    await supabase
      .from("module_visits")
      .update({
        last_seen_at: new Date().toISOString(),
        visit_count: (row.visit_count ?? 1) + 1,
      })
      .eq("id", row.id);
  } else {
    await supabase.from("module_visits").insert({
      user_id: userId,
      module_key: moduleKey,
      visited_on: visitedOn,
    });
  }

  return Response.json({ ok: true, tracked: true });
}
