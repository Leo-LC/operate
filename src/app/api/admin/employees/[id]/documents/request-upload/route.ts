import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { isOperationalAdmin } from "@/core/permissions/guards";
import {
  ALLOWED_PDF_MIMES,
  MAX_DOCS_PER_EMPLOYEE,
  generateStoragePath,
  isKnownDocType,
  isValidCustomDocTypeSlug,
  slugifyDocType,
  validateFileMeta,
} from "@/modules/admin/lib/employee-documents";

/**
 * Step 1/3 of direct upload (browser -> Supabase Storage, bypassing the
 * Vercel ~4.5MB function body limit). Validates metadata, reserves a storage
 * path, and returns a one-time signed upload URL the browser PUTs bytes to.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id: employeeId } = await params;

  let body: { file_name?: string; mime_type?: string; size_bytes?: number; doc_type?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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

  const mimeType = (body.mime_type ?? "").trim();
  const sizeBytes = body.size_bytes ?? 0;
  const validation = validateFileMeta({ type: mimeType, size: sizeBytes });
  if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });

  const rawType = (body.doc_type ?? "").trim();
  const slugged = slugifyDocType(rawType);
  const docType = isKnownDocType(rawType)
    ? rawType
    : isValidCustomDocTypeSlug(slugged)
      ? slugged
      : "id_card";

  // Extension follows the payload the browser will PUT (PDF as-is, images as
  // client-compressed WebP), not the original file name.
  const ext = ALLOWED_PDF_MIMES.includes(mimeType) ? "pdf" : "webp";
  const storagePath = generateStoragePath(DEFAULT_ORG_ID, employeeId, `upload.${ext}`);

  const { data: signed, error: signError } = await supabase.storage
    .from("employee-docs")
    .createSignedUploadUrl(storagePath);

  if (signError || !signed?.signedUrl) {
    return Response.json({ error: `Could not prepare upload: ${signError?.message ?? "unknown"}` }, { status: 500 });
  }

  return Response.json({
    storage_path: signed.path,
    signed_url: signed.signedUrl,
    doc_type: docType,
  });
}
