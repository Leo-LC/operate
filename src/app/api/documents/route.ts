import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { writeAuditLog } from "@/modules/admin/lib/audit";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import type { DocumentType, DocumentStatus } from "@/modules/documents/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

const SELECT_FIELDS = [
  "id", "organization_id", "location_id", "title", "thai_form_name",
  "document_type", "status", "code", "category", "authority", "frequency",
  "is_relevant", "has_document", "drive_url", "issued_at", "expires_at",
  "reminder_days_override", "responsible_person", "notes", "shop_notes",
  "last_checked_at", "created_by", "created_at", "updated_at",
  "locations ( name )",
].join(", ");

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "documents")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  const statusFilter = searchParams.get("status");
  const typeFilter = searchParams.get("type");
  const categoryFilter = searchParams.get("category");

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("documents")
    .select(SELECT_FIELDS)
    .is("deleted_at", null)
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("expires_at", { ascending: true, nullsFirst: false });

  if (locationId) query = query.eq("location_id", locationId);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (typeFilter) query = query.eq("document_type", typeFilter);
  if (categoryFilter) query = query.eq("category", categoryFilter);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

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
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "documents")) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    title: string;
    thai_form_name?: string | null;
    document_type?: DocumentType;
    status?: DocumentStatus;
    code?: string | null;
    category?: string | null;
    authority?: string | null;
    frequency?: string | null;
    location_id?: string | null;
    is_relevant?: boolean;
    has_document?: boolean;
    drive_url?: string | null;
    issued_at?: string | null;
    expires_at?: string | null;
    reminder_days_override?: number | null;
    responsible_person?: string | null;
    notes?: string | null;
    shop_notes?: string | null;
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
      organization_id: DEFAULT_ORG_ID,
      location_id: body.location_id ?? null,
      title: body.title.trim(),
      thai_form_name: body.thai_form_name ?? null,
      document_type: body.document_type ?? "other",
      status: body.status ?? "missing",
      code: body.code ?? null,
      category: body.category ?? null,
      authority: body.authority ?? null,
      frequency: body.frequency ?? null,
      is_relevant: body.is_relevant ?? true,
      has_document: body.has_document ?? false,
      drive_url: body.drive_url ?? null,
      issued_at: body.issued_at ?? null,
      expires_at: body.expires_at ?? null,
      reminder_days_override: body.reminder_days_override ?? null,
      responsible_person: body.responsible_person ?? null,
      notes: body.notes ?? null,
      shop_notes: body.shop_notes ?? null,
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
