import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { computeStatus } from "@/modules/documents/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

function esc(v: string | null | undefined): string {
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
    .select("id, title, document_type, status, expires_at, issued_at, responsible_person, notes, drive_url, created_at, locations ( name )")
    .is("deleted_at", null)
    .eq("organization_id", ORG_ID)
    .order("expires_at", { ascending: true, nullsFirst: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string; title: string; document_type: string; status: string; expires_at: string | null;
    issued_at: string | null; responsible_person: string | null; notes: string | null;
    drive_url: string | null; created_at: string; locations: { name: string } | null;
  };

  const rows = data as unknown as Row[];
  const header = ["ID", "Title", "Type", "Status", "Location", "Issued", "Expires", "Responsible", "Drive URL", "Notes", "Created"].join(",");
  const lines = rows.map((r) => {
    const status = computeStatus({ status: r.status as Parameters<typeof computeStatus>[0]["status"], expires_at: r.expires_at });
    return [
      esc(r.id), esc(r.title), esc(r.document_type), esc(status),
      esc(r.locations?.name), esc(r.issued_at), esc(r.expires_at),
      esc(r.responsible_person), esc(r.drive_url), esc(r.notes), esc(r.created_at),
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
