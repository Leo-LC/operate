import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function DELETE(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { batchId } = await params;
  const supabase = getSupabaseServerClient();

  const { data: batch, error: fetchErr } = await supabase
    .from("sheet_import_batches")
    .select("id, location_id, entry_ids, reverted_at")
    .eq("id", batchId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (fetchErr || !batch) return Response.json({ error: "Import batch not found" }, { status: 404 });
  if (batch.reverted_at) return Response.json({ error: "This import has already been reverted" }, { status: 409 });

  const entryIds = (batch.entry_ids ?? []) as string[];
  let deleted = 0;

  if (entryIds.length > 0) {
    const { error: deleteErr, count } = await supabase
      .from("daily_entries")
      .delete({ count: "exact" })
      .in("id", entryIds);

    if (deleteErr) return Response.json({ error: deleteErr.message }, { status: 500 });
    deleted = count ?? 0;
  }

  await supabase
    .from("sheet_import_batches")
    .update({ reverted_at: new Date().toISOString(), reverted_by: session.user.userId ?? null })
    .eq("id", batchId);

  await writeAuditLog({
    userId:     session.user.userId ?? null,
    action:     "accounting.sheets.revert",
    moduleKey:  "accounting",
    entityType: "sheet_import_batch",
    entityId:   batchId,
    payload:    { location_id: batch.location_id, deleted_count: deleted, batch_id: batchId },
  });

  return Response.json({ deleted });
}
