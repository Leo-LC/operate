import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { MASTER_DOCUMENTS } from "@/modules/documents/masterList";
import { DEFAULT_ORG_ID } from "@/lib/constants";

/** POST /api/documents/sync
 * For every active location, insert a document row for each master document code
 * that doesn't already exist. Returns { created, skipped }.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "documents")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();

  const { data: locations, error: locErr } = await supabase
    .from("locations")
    .select("id")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (locErr) return Response.json({ error: locErr.message }, { status: 500 });

  let created = 0;
  let skipped = 0;

  for (const loc of locations ?? []) {
    const rows = MASTER_DOCUMENTS.map((m) => ({
      organization_id: DEFAULT_ORG_ID,
      location_id: loc.id,
      title: m.title,
      thai_form_name: m.thai_form_name,
      code: m.code,
      category: m.category,
      document_type: m.document_type,
      authority: m.authority,
      frequency: m.frequency,
      status: "missing" as const,
    }));

    const { data, error } = await supabase
      .from("documents")
      .upsert(rows, {
        onConflict: "location_id,code",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const insertedCount = data?.length ?? 0;
    created += insertedCount;
    skipped += rows.length - insertedCount;
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "documents.sync",
    moduleKey: "documents",
    entityType: "document",
    entityId: undefined,
    payload: { created, skipped },
  });

  return Response.json({ created, skipped });
}
