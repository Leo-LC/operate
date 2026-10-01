import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_MODULE_VISIBILITY, GATED_MODULES } from "@/lib/module-visibility";

const VALID_KEYS = new Set<string>(GATED_MODULES as readonly string[]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("module_visibility").select("module_key, visible");
  if (error) return Response.json({ ...DEFAULT_MODULE_VISIBILITY });
  const merged: Record<string, boolean> = { ...DEFAULT_MODULE_VISIBILITY };
  for (const row of data ?? []) {
    if (VALID_KEYS.has(row.module_key)) merged[row.module_key] = !!row.visible;
  }
  return Response.json(merged);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { module_key?: string; visible?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { module_key, visible } = body;
  if (!module_key || typeof visible !== "boolean" || !VALID_KEYS.has(module_key)) {
    return Response.json(
      { error: "module_key and visible (boolean) required, valid keys: " + Array.from(VALID_KEYS).join(", ") },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("module_visibility").upsert(
    { module_key, visible, updated_by: session.user.userId ?? null, updated_at: new Date().toISOString() },
    { onConflict: "module_key" }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, module_key, visible });
}
