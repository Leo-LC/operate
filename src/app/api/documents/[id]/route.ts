import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { computeStatus } from "@/modules/documents/types";
import type { DocumentType } from "@/modules/documents/types";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "documents")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    title?: string;
    thai_form_name?: string | null;
    document_type?: DocumentType;
    code?: string | null;
    category?: string | null;
    authority?: string | null;
    frequency?: string | null;
    location_id?: string | null;
    is_relevant?: boolean;
    has_document?: boolean;
    drive_url?: string | null;
    issued_at?: string | null;
    expires_at?: string | null;
    reminder_days_override?: number | null;
    notes?: string | null;
    shop_notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedKeys = [
    "title", "thai_form_name", "document_type", "code", "category",
    "authority", "frequency", "location_id", "is_relevant", "has_document",
    "drive_url", "issued_at", "expires_at", "reminder_days_override",
    "notes", "shop_notes",
  ] as const;
  for (const key of allowedKeys) {
    if (key in body) updates[key] = body[key as keyof typeof body];
  }

  // Fetch current document for status computation and cascade detection.
  const supabase = getSupabaseServerClient();
  const { data: current } = await supabase
    .from("documents")
    .select("is_relevant, has_document, expires_at, code, title, organization_id")
    .eq("id", params.id)
    .single();
  if (current) {
    const is_relevant = "is_relevant" in updates ? (updates.is_relevant as boolean) : current.is_relevant;
    const has_document = "has_document" in updates ? (updates.has_document as boolean) : current.has_document;
    const expires_at = "expires_at" in updates ? (updates.expires_at as string | null) : current.expires_at;
    updates.status = computeStatus({ is_relevant, has_document, expires_at });
  }

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", params.id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !data) return Response.json({ error: "Document not found or update failed" }, { status: 404 });

  // Cascade title/code changes to all org documents with the same original code (owner only).
  const titleChanged = "title" in updates && current?.title && updates.title !== current.title;
  const codeChanged = "code" in updates && current?.code && updates.code !== current.code;
  if ((titleChanged || codeChanged) && current?.code && current.organization_id && session.user.role === "owner") {
    const cascadeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (titleChanged) cascadeUpdates.title = updates.title;
    if (codeChanged) cascadeUpdates.code = updates.code;
    await supabase
      .from("documents")
      .update(cascadeUpdates)
      .eq("organization_id", current.organization_id)
      .eq("code", current.code)
      .neq("id", params.id)   // skip the already-updated doc
      .is("deleted_at", null);
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "documents.update",
    moduleKey: "documents",
    entityType: "document",
    entityId: params.id,
    payload: updates,
  });

  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "documents")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id)
    .is("deleted_at", null);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "documents.delete",
    moduleKey: "documents",
    entityType: "document",
    entityId: params.id,
    payload: undefined,
  });

  return new Response(null, { status: 204 });
}
