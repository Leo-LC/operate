import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { derivePermissionsFromRole, hasModuleAccess } from "@/core/permissions/guards";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasModuleAccess(derivePermissionsFromRole(session.user.role), "animals")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("animals")
    .select("name, species, sex, next_vaccination_date, notes, locations ( name )")
    .is("deleted_at", null)
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = {
    name: string; species: string; sex: string | null;
    next_vaccination_date: string | null; notes: string | null;
    locations: { name: string } | null;
  };

  const rows = data as unknown as Row[];
  const date = new Date().toISOString().slice(0, 10);

  const tableRows = rows.map((r) => `
    <tr>
      <td>${r.name}</td>
      <td class="cap">${r.species}</td>
      <td class="cap">${r.sex ?? "Unknown"}</td>
      <td>${r.locations?.name ?? "—"}</td>
      <td>${r.next_vaccination_date ?? "—"}</td>
      <td class="notes">${r.notes ? r.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "—"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Animals — ${date}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;padding:24px;color:#111}
  h2{margin:0 0 4px;font-size:15px;font-weight:700}
  .sub{margin:0 0 16px;color:#666;font-size:10px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}
  th{background:#f5f5f5;font-weight:600;font-size:10px;white-space:nowrap}
  .cap{text-transform:capitalize}
  .notes{max-width:200px;word-break:break-word;color:#555}
  @media print{@page{margin:12mm}body{padding:0}}
</style></head><body>
<h2>Animals</h2>
<p class="sub">Exported ${date} · ${rows.length} animal${rows.length !== 1 ? "s" : ""}</p>
<table>
  <thead><tr><th>Name</th><th>Species</th><th>Sex</th><th>Location</th><th>Next vaccine</th><th>Notes</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
