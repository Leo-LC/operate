import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import type { DocumentType, DocumentStatus } from "@/modules/documents/types";

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  const statusFilter = searchParams.get("status");
  const typeFilter = searchParams.get("type");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("documents")
    .select("id, organization_id, location_id, title, document_type, status, drive_url, issued_at, expires_at, responsible_person, notes, last_checked_at, created_by, created_at, updated_at, locations ( name )")
    .is("deleted_at", null)
    .eq("organization_id", ORG_ID)
    .order("expires_at", { ascending: true, nullsFirst: false });

  if (locationId) query = query.eq("location_id", locationId);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (typeFilter) query = query.eq("document_type", typeFilter);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = { id: string; organization_id: string; location_id: string | null; title: string; document_type: string; status: string; drive_url: string | null; issued_at: string | null; expires_at: string | null; responsible_person: string | null; notes: string | null; last_checked_at: string | null; created_by: string | null; created_at: string; updated_at: string; locations: { name: string } | null };
  const mapped = (data as unknown as Row[]).map((d) => ({
    ...d,
    location_name: d.locations?.name ?? null,
    locations: undefined,
  }));

  return Response.json(mapped);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    title: string;
    document_type?: DocumentType;
    status?: DocumentStatus;
    location_id?: string | null;
    drive_url?: string | null;
    issued_at?: string | null;
    expires_at?: string | null;
    responsible_person?: string | null;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title?.trim()) return Response.json({ error: "title is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: ORG_ID,
      location_id: body.location_id ?? null,
      title: body.title.trim(),
      document_type: body.document_type ?? "other",
      status: body.status ?? "valid",
      drive_url: body.drive_url ?? null,
      issued_at: body.issued_at ?? null,
      expires_at: body.expires_at ?? null,
      responsible_person: body.responsible_person ?? null,
      notes: body.notes ?? null,
      created_by: session.user.userId ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: session.user.userId ?? null,
    action: "documents.create",
    moduleKey: "documents",
    entityType: "document",
    entityId: data.id,
    payload: { title: body.title, document_type: body.document_type ?? "other" },
  });

  return Response.json(data, { status: 201 });
}
