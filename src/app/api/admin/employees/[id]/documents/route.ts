import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { isOperationalAdmin } from "@/core/permissions/guards";
import { validateFile, compressFile, generateStoragePath } from "@/modules/admin/lib/compress-image";
import { DOC_TYPES, MAX_DOCS_PER_EMPLOYEE } from "@/modules/admin/lib/employee-documents";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id: employeeId } = await params;

  const supabase = getSupabaseServerClient();

  const { data: emp, error: empError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .single();

  if (empError || !emp) return Response.json({ error: "Employee not found" }, { status: 404 });

  const { count: existingCount } = await supabase
    .from("employee_documents")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId);

  if ((existingCount ?? 0) >= MAX_DOCS_PER_EMPLOYEE) {
    return Response.json(
      { error: `Maximum ${MAX_DOCS_PER_EMPLOYEE} documents per employee` },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const docType = formData.get("doc_type") as string;
  const fileName = formData.get("file_name") as string;

  if (!file || typeof file === "string") {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const validation = validateFile(file as File);
  if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });

  const finalDocType = docType && (DOC_TYPES as readonly string[]).includes(docType)
    ? docType
    : "id_card";

  const originalName = (file as File).name;
  const finalFileName = fileName?.trim() || originalName;

  let compressed;
  try {
    compressed = await compressFile(file as File);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "File processing failed" }, { status: 400 });
  }
  const storagePath = generateStoragePath(DEFAULT_ORG_ID, employeeId, compressed.originalName);

  const { error: uploadError } = await supabase.storage
    .from("employee-docs")
    .upload(storagePath, compressed.buffer, { contentType: compressed.mimeType, upsert: false });

  if (uploadError) {
    return Response.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: doc, error: docError } = await supabase
    .from("employee_documents")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      employee_id: employeeId,
      doc_type: finalDocType,
      file_name: finalFileName,
      storage_path: storagePath,
      mime_type: compressed.mimeType,
      size_bytes: compressed.sizeBytes,
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();

  if (docError) {
    await supabase.storage.from("employee-docs").remove([storagePath]);
    return Response.json({ error: docError.message }, { status: 500 });
  }

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "admin.employee.document.upload",
    moduleKey: "admin",
    entityType: "employee_document",
    entityId: doc.id,
    payload: { employee_id: employeeId, doc_type: finalDocType, file_name: finalFileName },
  });

  return Response.json(doc, { status: 201 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id: employeeId } = await params;

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("employee_documents")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data ?? []);
}