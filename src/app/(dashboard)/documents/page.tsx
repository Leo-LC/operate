import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DocumentsClient } from "@/modules/documents/components/DocumentsClient";
import { getAllowedLocationIds } from "@/core/permissions/server";
import type { Document } from "@/modules/documents/types";
import type { AdminLocation } from "@/modules/admin/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

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

  const allowedIds = await getAllowedLocationIds(session.user.userId, session.user.role === "owner");

  if (allowedIds !== null && allowedIds.length === 0) {
    return (
      <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 24, fontSize: 13, color: "var(--fg-4)" }}>
        You don&apos;t have access to any location yet. Ask your admin.
      </div>
    );
  }

  const supabase = getSupabaseServerClient();

  let docsQuery = supabase
    .from("documents")
    .select(SELECT_FIELDS)
    .is("deleted_at", null)
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  let locQuery = supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .eq("is_active", true)
    .order("name");

  if (allowedIds !== null) {
    docsQuery = docsQuery.in("location_id", allowedIds);
    locQuery = locQuery.in("id", allowedIds);
  }

  const [{ data: docsData }, { data: locationsData }] = await Promise.all([docsQuery, locQuery]);

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
