import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromSession } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";

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
  const perms = await getUserPermissionsFromSession(session);
  if (!hasModuleAccess(perms, "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("animals")
    .select("id, name, species, sex, status, estimated_birth_date, arrival_date, microchip_id, created_at, locations ( name )")
    .is("deleted_at", null)
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string; name: string; species: string; sex: string | null; status: string;
    estimated_birth_date: string | null; arrival_date: string | null; microchip_id: string | null;
    created_at: string; locations: { name: string } | null;
  };

  const rows = data as unknown as Row[];
  const header = ["ID", "Name", "Species", "Sex", "Status", "Location", "Birth Date", "Arrival Date", "Microchip", "Created"].join(",");
  const lines = rows.map((r) => [
    esc(r.id), esc(r.name), esc(r.species), esc(r.sex), esc(r.status),
    esc(r.locations?.name), esc(r.estimated_birth_date), esc(r.arrival_date),
    esc(r.microchip_id), esc(r.created_at),
  ].join(","));

  const csv = [header, ...lines].join("\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="animals-${date}.csv"`,
    },
  });
}
