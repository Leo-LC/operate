import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { daysUntilExpiry } from "@/modules/documents/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

function esc(v: string | number | boolean | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "documents")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select([
      "id", "code", "title", "thai_form_name", "category", "document_type", "authority", "frequency",
      "is_relevant", "has_document", "status", "issued_at", "expires_at",
      "reminder_days_override", "responsible_person", "drive_url", "notes", "shop_notes",
      "created_at", "locations ( name )",
    ].join(", "))
    .is("deleted_at", null)
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string; code: string | null; title: string; thai_form_name: string | null;
    category: string | null; document_type: string; authority: string | null; frequency: string | null;
    is_relevant: boolean; has_document: boolean; status: string; issued_at: string | null;
    expires_at: string | null; reminder_days_override: number | null;
    responsible_person: string | null; drive_url: string | null;
    notes: string | null; shop_notes: string | null; created_at: string;
    locations: { name: string } | null;
  };

  const rows = data as unknown as Row[];

  const header = [
    "Code", "Document", "Thai form", "Category", "Type", "Authority", "Frequency",
    "Location", "Relevant", "Has document", "Status", "Issue date", "Expiry / next due",
    "Days until expiry", "Responsible", "Drive link", "Notes", "Shop notes", "Created",
  ].join(",");

  const lines = rows.map((r) => {
    const status = r.status;
    const days = daysUntilExpiry(r.expires_at);
    return [
      esc(r.code),
      esc(r.title),
      esc(r.thai_form_name),
      esc(r.category),
      esc(r.document_type),
      esc(r.authority),
      esc(r.frequency),
      esc(r.locations?.name),
      esc(r.is_relevant ? "Yes" : "No"),
      esc(r.has_document ? "Yes" : "No"),
      esc(status),
      esc(r.issued_at),
      esc(r.expires_at),
      esc(days),
      esc(r.responsible_person),
      esc(r.drive_url),
      esc(r.notes),
      esc(r.shop_notes),
      esc(r.created_at),
    ].join(",");
  });

  const csv = [header, ...lines].join("\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="documents-${date}.csv"`,
    },
  });
}
