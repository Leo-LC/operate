import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import type { DocumentType, DocumentStatus } from "@/modules/documents/types";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "documents")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    title?: string;
    thai_form_name?: string | null;
    document_type?: DocumentType;
    status?: DocumentStatus;
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
    responsible_person?: string | null;
    notes?: string | null;
    shop_notes?: string | null;
    last_checked_at?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedKeys = [
    "title", "thai_form_name", "document_type", "status", "code", "category",
    "authority", "frequency", "location_id", "is_relevant", "has_document",
    "drive_url", "issued_at", "expires_at", "reminder_days_override",
    "responsible_person", "notes", "shop_notes", "last_checked_at",
  ] as const;
  for (const key of allowedKeys) {
    if (key in body) updates[key] = body[key as keyof typeof body];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", params.id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !data) return Response.json({ error: "Document not found or update failed" }, { status: 404 });

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
