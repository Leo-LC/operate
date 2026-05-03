import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { AdminLocation } from "@/modules/admin/types";

export default async function AdminLocationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (session.user.role !== "owner") redirect("/dashboard");

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("locations")
    .select("id, name, slug, external_id, is_active, created_at")
    .order("name");

  const locations: AdminLocation[] = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Locations</h1>
        <span className="text-sm text-muted-foreground">{locations.length} total</span>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Slug</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">External ID</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {locations.map((loc) => (
              <tr key={loc.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 font-medium">{loc.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{loc.slug}</td>
                <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                  {loc.external_id ?? <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      loc.is_active
                        ? "bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-[var(--success)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {loc.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
