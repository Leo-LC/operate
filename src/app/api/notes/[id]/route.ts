import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireNotesUser } from "@/modules/notes/server";
import { isNoteKind } from "@/modules/notes/types";

const MAX_BODY_LENGTH = 2000;

/** PATCH /api/notes/[id] { resolved?, body?, kind? } */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireNotesUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { resolved?: boolean; body?: string; kind?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.resolved !== undefined) updates.resolved = !!body.resolved;
  if (body.body !== undefined) {
    const text = body.body.trim();
    if (!text || text.length > MAX_BODY_LENGTH) {
      return Response.json({ error: `body required (${MAX_BODY_LENGTH} chars max)` }, { status: 400 });
    }
    updates.body = text;
  }
  if (body.kind !== undefined) {
    if (!isNoteKind(body.kind)) {
      return Response.json({ error: "kind must be idea, todo or warning" }, { status: 400 });
    }
    updates.kind = body.kind;
  }
  if (Object.keys(updates).length === 1) {
    return Response.json({ error: "nothing to update" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("page_notes").update(updates).eq("id", params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

/** DELETE /api/notes/[id] — shared mode: any owner/admin may delete any note. */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireNotesUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("page_notes").delete().eq("id", params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
