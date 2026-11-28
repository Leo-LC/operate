import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { isValidVisibilityKey } from "@/lib/module-visibility";

/** GET every visibility flag. Absent keys are treated as visible by clients. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("module_visibility").select("module_key, visible");
  if (error) return Response.json({});
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.module_key] = !!row.visible;
  return Response.json(map);
}

/** Owner-only toggle. Keys are `module:<nav-item-id>` or `tab:<module>.<tab>`. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { key?: string; visible?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, visible } = body;
  if (!key || typeof visible !== "boolean" || !isValidVisibilityKey(key)) {
    return Response.json(
      { error: "key (module:<id> or tab:<module>.<tab>) and visible (boolean) required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("module_visibility").upsert(
    { module_key: key, visible, updated_by: session.user.userId ?? null, updated_at: new Date().toISOString() },
    { onConflict: "module_key" }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, key, visible });
}
