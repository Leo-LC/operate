import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getAllowedLocationIds, getUserPermissionsFromDb } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export interface DocumentSearchItem {
  id: string;
  title: string;
  code: string | null;
  location_name: string | null;
  status: string;
  expires_at: string | null;
}

/** GET /api/documents/search?q=…
 * Global-search (⌘K) backend: matches title, code, and Thai form name.
 * Respects the caller's location access.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role);
  if (!hasModuleAccess(permissions, "documents")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ items: [] });

  const allowedIds = await getAllowedLocationIds(
    session.user.userId,
    session.user.role === "owner" || session.user.role === "admin",
  );
  if (allowedIds !== null && allowedIds.length === 0) return Response.json({ items: [] });

  const like = `%${q}%`;
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("documents")
    .select("id, title, code, status, expires_at, locations ( name )")
    .is("deleted_at", null)
    .eq("organization_id", DEFAULT_ORG_ID)
    .or(`title.ilike.${like},code.ilike.${like},thai_form_name.ilike.${like}`)
    .order("title", { ascending: true })
    .limit(8);

  if (allowedIds !== null) query = query.in("location_id", allowedIds);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string; title: string; code: string | null; status: string; expires_at: string | null;
    locations: { name: string } | null;
  };
  const items: DocumentSearchItem[] = ((data as unknown as Row[]) ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    code: d.code,
    location_name: d.locations?.name ?? null,
    status: d.status,
    expires_at: d.expires_at,
  }));

  return Response.json({ items });
}
