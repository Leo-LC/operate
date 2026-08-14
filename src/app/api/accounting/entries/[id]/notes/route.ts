import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("daily_entry_notes")
    .select("field_name, note, updated_at")
    .eq("entry_id", id)
    .eq("organization_id", DEFAULT_ORG_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Return as a map: { field_name: note }
  const notes: Record<string, string> = {};
  for (const row of data ?? []) {
    notes[row.field_name as string] = row.note as string;
  }

  return Response.json({ notes });
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "accounting"))
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;

  let body: { field_name: string; note: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.field_name) return Response.json({ error: "field_name is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();

  if (!body.note || body.note.trim() === "") {
    // Delete the note if empty
    await supabase
      .from("daily_entry_notes")
      .delete()
      .eq("entry_id", id)
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("field_name", body.field_name);

    return Response.json({ deleted: true });
  }

  const { data, error } = await supabase
    .from("daily_entry_notes")
    .upsert({
      organization_id: DEFAULT_ORG_ID,
      entry_id: id,
      field_name: body.field_name,
      note: body.note.trim(),
      created_by: session.user.userId ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "entry_id,field_name" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data, { status: 200 });
}
