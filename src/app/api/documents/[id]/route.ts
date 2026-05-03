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
    document_type?: DocumentType;
    status?: DocumentStatus;
    location_id?: string | null;
    drive_url?: string | null;
    issued_at?: string | null;
    expires_at?: string | null;
    responsible_person?: string | null;
    notes?: string | null;
    last_checked_at?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedKeys = [
    "title", "document_type", "status", "location_id", "drive_url",
    "issued_at", "expires_at", "responsible_person", "notes", "last_checked_at",
  ] as const;
  for (const key of allowedKeys) {
    if (key in body) updates[key] = body[key];
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
