import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { isOperationalAdmin } from "@/core/permissions/guards";
import { DOC_TYPES } from "@/modules/admin/lib/employee-documents";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id: employeeId, docId } = await params;

  let body: { file_name?: string; doc_type?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: doc, error: fetchError } = await supabase
    .from("employee_documents")
    .select("*")
    .eq("id", docId)
    .eq("employee_id", employeeId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (fetchError || !doc) return Response.json({ error: "Document not found" }, { status: 404 });

  const updates: Record<string, string> = {};

  if (body.file_name !== undefined) {
    const trimmed = body.file_name.trim();
    if (!trimmed || trimmed.length > 120) {
      return Response.json({ error: "File name must be 1-120 characters" }, { status: 400 });
    }
    updates.file_name = trimmed;
  }

  if (body.doc_type !== undefined) {
    if (!(DOC_TYPES as readonly string[]).includes(body.doc_type)) {
      return Response.json({ error: "Invalid document type" }, { status: 400 });
    }
    updates.doc_type = body.doc_type;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("employee_documents")
    .update(updates)
    .eq("id", docId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.document.update",
    moduleKey: "admin",
    entityType: "employee_document",
    entityId: docId,
    payload: { employee_id: employeeId, changes: updates },
  });

  return Response.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id: employeeId, docId } = await params;

  const supabase = getSupabaseServerClient();

  const { data: doc, error: fetchError } = await supabase
    .from("employee_documents")
    .select("*")
    .eq("id", docId)
    .eq("employee_id", employeeId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (fetchError || !doc) return Response.json({ error: "Document not found" }, { status: 404 });

  const { error: storageError } = await supabase.storage
    .from("employee-docs")
    .remove([doc.storage_path]);

  if (storageError) {
    return Response.json({ error: `Storage delete failed: ${storageError.message}` }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("employee_documents")
    .delete()
    .eq("id", docId);

  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.document.delete",
    moduleKey: "admin",
    entityType: "employee_document",
    entityId: docId,
    payload: { employee_id: employeeId, file_name: doc.file_name },
  });

  return Response.json({ ok: true });
}