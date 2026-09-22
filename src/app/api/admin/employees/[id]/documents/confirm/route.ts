import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { isOperationalAdmin } from "@/core/permissions/guards";
import {
  ALLOWED_MIMES,
  MAX_DOCS_PER_EMPLOYEE,
  MAX_SIZE_BYTES,
  isKnownDocType,
  isValidCustomDocTypeSlug,
  slugifyDocType,
} from "@/modules/admin/lib/employee-documents";

/** Detect the real content type from magic bytes (never trust client headers). */
function detectMime(buffer: Buffer): string | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    return "application/pdf";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("binary") === "RIFF" &&
    buffer.subarray(8, 12).toString("binary") === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

/**
 * Step 3/3 of direct upload: after the browser PUTs bytes to the signed URL,
 * verify the stored object (size, real content type) and register the row.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id: employeeId } = await params;

  let body: { storage_path?: string; file_name?: string; doc_type?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const storagePath = (body.storage_path ?? "").trim();
  // The path must be one our request-upload step issued (org/employee/uuid.ext).
  const prefix = `${DEFAULT_ORG_ID}/${employeeId}/`;
  if (!storagePath.startsWith(prefix) || storagePath.includes("..")) {
    return Response.json({ error: "Invalid storage path" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: emp, error: empError } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .is("deleted_at", null)
    .single();

  if (empError || !emp) {
    await supabase.storage.from("employee-docs").remove([storagePath]);
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const { count: existingCount } = await supabase
    .from("employee_documents")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId);

  if ((existingCount ?? 0) >= MAX_DOCS_PER_EMPLOYEE) {
    await supabase.storage.from("employee-docs").remove([storagePath]);
    return Response.json(
      { error: `Maximum ${MAX_DOCS_PER_EMPLOYEE} documents per employee` },
      { status: 400 }
    );
  }

  const { data: blob, error: dlError } = await supabase.storage
    .from("employee-docs")
    .download(storagePath);

  if (dlError || !blob) {
    return Response.json({ error: "Uploaded file not found — please retry" }, { status: 400 });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  if (buffer.length > MAX_SIZE_BYTES || buffer.length === 0) {
    await supabase.storage.from("employee-docs").remove([storagePath]);
    return Response.json({ error: "File too large: max 8MB" }, { status: 400 });
  }

  const detected = detectMime(buffer);
  if (!detected || !ALLOWED_MIMES.includes(detected)) {
    await supabase.storage.from("employee-docs").remove([storagePath]);
    return Response.json({ error: "Unsupported file content" }, { status: 400 });
  }

  const rawType = (body.doc_type ?? "").trim();
  const slugged = slugifyDocType(rawType);
  const finalDocType = isKnownDocType(rawType)
    ? rawType
    : isValidCustomDocTypeSlug(slugged)
      ? slugged
      : "id_card";

  const finalFileName = (body.file_name ?? "").trim() || storagePath.split("/").pop() || "document";

  const { data: doc, error: docError } = await supabase
    .from("employee_documents")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      employee_id: employeeId,
      doc_type: finalDocType,
      file_name: finalFileName,
      storage_path: storagePath,
      mime_type: detected,
      size_bytes: buffer.length,
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
