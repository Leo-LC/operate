import { getSupabaseServerClient } from "@/lib/supabase-server";
import { requireNotesUser } from "@/modules/notes/server";
import { isNoteKind, moduleKeyFromPath } from "@/modules/notes/types";
import type { PageNote } from "@/modules/notes/types";

const MAX_BODY_LENGTH = 2000;

/** GET /api/notes?path=/accounting  → all notes (active + resolved) for a page
 *  GET /api/notes?all=1             → every active note, newest first */
export async function GET(request: Request) {
  const session = await requireNotesUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const all = url.searchParams.get("all") === "1";
  if (!all && !(path && path.startsWith("/"))) {
    return Response.json({ error: "path or all=1 required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("page_notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (!all) query = query.eq("path", path);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ notes: (data ?? []) as PageNote[] });
}

/** POST /api/notes { path, kind, body } → create a note for the current page */
export async function POST(request: Request) {
  const session = await requireNotesUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { path?: string; kind?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const path = body.path?.trim();
  const text = body.body?.trim();
  const kind = body.kind ?? "idea";
  if (!path || !path.startsWith("/")) {
    return Response.json({ error: "path must start with /" }, { status: 400 });
  }
  if (!text || text.length > MAX_BODY_LENGTH) {
    return Response.json({ error: `body required (${MAX_BODY_LENGTH} chars max)` }, { status: 400 });
  }
  if (!isNoteKind(kind)) {
    return Response.json({ error: "kind must be idea, todo or warning" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const email = (session.user?.email ?? "").toLowerCase();
  const authorName =
    session.user?.name ??
    email.split("@")[0]?.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
    email;

  const { data, error } = await supabase
    .from("page_notes")
    .insert({
      path,
      module_key: moduleKeyFromPath(path),
      kind,
      body: text,
      author_id: session.user?.userId ?? null,
      author_email: email,
      author_name: authorName,
    })
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ note: data as PageNote }, { status: 201 });
}
