import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { isOperationalAdmin } from "@/core/permissions/guards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isOperationalAdmin(session.user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id: employeeId, docId } = await params;

  const supabase = getSupabaseServerClient();

  const { data: doc, error } = await supabase
    .from("employee_documents")
    .select("storage_path, file_name, mime_type")
    .eq("id", docId)
    .eq("employee_id", employeeId)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (error || !doc) return Response.json({ error: "Document not found" }, { status: 404 });

  const { data: signedData, error: signError } = await supabase.storage
    .from("employee-docs")
    .createSignedUrl(doc.storage_path, 60);

  if (signError || !signedData?.signedUrl) {
    return Response.json({ error: "Failed to create signed URL" }, { status: 500 });
  }

  return Response.json({
    url: signedData.signedUrl,
    file_name: doc.file_name,
    mime_type: doc.mime_type,
  });
}