import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// Same eye-toggle pattern as /api/direction/tabs: the DB table is the shared
// source of truth, owner/admin POST toggles, everyone else GETs.
const DEFAULT_VISIBILITY: Record<string, boolean> = {
  stats: true,
};

const VALID_TABS = new Set(Object.keys(DEFAULT_VISIBILITY));

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("reviews_tab_visibility").select("tab_key, visible");
  if (error) {
    // Table not yet migrated → fall back to defaults
    return Response.json(DEFAULT_VISIBILITY);
  }
  const merged = { ...DEFAULT_VISIBILITY };
  for (const row of data ?? []) {
    if (VALID_TABS.has(row.tab_key)) merged[row.tab_key] = !!row.visible;
  }
  return Response.json(merged);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!["owner", "admin"].includes(session.user.role ?? "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { tab_key?: string; visible?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tab_key, visible } = body;
  if (!tab_key || typeof visible !== "boolean" || !VALID_TABS.has(tab_key)) {
    return Response.json({
      error: "tab_key and visible (boolean) required, valid tabs: " + Array.from(VALID_TABS).join(", "),
    }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("reviews_tab_visibility").upsert(
    {
      tab_key,
      visible,
      updated_by: session.user.userId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tab_key" }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, tab_key, visible });
}
