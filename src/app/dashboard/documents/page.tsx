import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DocumentsClient } from "@/modules/documents/components/DocumentsClient";
import type { Document } from "@/modules/documents/types";
import type { AdminLocation } from "@/modules/admin/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

const SELECT_FIELDS = [
  "id", "organization_id", "location_id", "title", "thai_form_name",
  "document_type", "status", "code", "category", "authority", "frequency",
  "is_relevant", "has_document", "drive_url", "issued_at", "expires_at",
  "reminder_days_override", "responsible_person", "notes", "shop_notes",
  "last_checked_at", "created_by", "created_at", "updated_at",
  "locations ( name )",
].join(", ");

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const supabase = getSupabaseServerClient();
  const [{ data: docsData }, { data: locationsData }] = await Promise.all([
    supabase
      .from("documents")
      .select(SELECT_FIELDS)
      .is("deleted_at", null)
      .eq("organization_id", ORG_ID)
      .order("category", { ascending: true })
      .order("title", { ascending: true }),
    supabase
      .from("locations")
      .select("id, name, slug, external_id, is_active, created_at")
      .eq("is_active", true)
      .order("name"),
  ]);

  type Row = {
    id: string; organization_id: string; location_id: string | null; title: string;
    thai_form_name: string | null; document_type: string; status: string;
    code: string | null; category: string | null; authority: string | null; frequency: string | null;
    is_relevant: boolean; has_document: boolean; drive_url: string | null;
    issued_at: string | null; expires_at: string | null; reminder_days_override: number | null;
    responsible_person: string | null; notes: string | null; shop_notes: string | null;
    last_checked_at: string | null; created_by: string | null; created_at: string; updated_at: string;
    locations: { name: string } | null;
  };

  const documents: Document[] = (docsData as unknown as Row[] ?? []).map((d) => ({
    ...d,
    document_type: d.document_type as Document["document_type"],
    status: d.status as Document["status"],
    is_relevant: d.is_relevant ?? true,
    has_document: d.has_document ?? false,
    location_name: d.locations?.name ?? null,
  }));

  const locations: AdminLocation[] = locationsData ?? [];

  return <DocumentsClient initialDocuments={documents} locations={locations} />;
}
