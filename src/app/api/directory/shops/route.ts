import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import type { DirectoryShop } from "@/modules/directory/types";

const SHOP_FIELDS = [
  "id", "name", "slug", "is_active",
  "phone", "line_id", "address_en", "address_th",
  "company_name_th", "tax_id", "branch",
  "opening_hours", "manager_name", "notes",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role);
  if (!hasModuleAccess(permissions, "contacts")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  // select("*") keeps the route working even before the directory migration is applied
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const shops: DirectoryShop[] = (data ?? []).map((l) => {
    const row = l as Record<string, unknown>;
    const pick = (k: string): string | null => {
      const v = row[k];
      return typeof v === "string" && v.length > 0 ? v : null;
    };
    void SHOP_FIELDS;
    return {
      id: String(row.id),
      name: String(row.name ?? ""),
      slug: typeof row.slug === "string" ? row.slug : "",
      is_active: row.is_active !== false,
      phone: pick("phone"),
      line_id: pick("line_id"),
      address_en: pick("address_en"),
      address_th: pick("address_th"),
      company_name_th: pick("company_name_th"),
      tax_id: pick("tax_id"),
      branch: pick("branch"),
      opening_hours: pick("opening_hours"),
      manager_name: pick("manager_name"),
      notes: pick("notes"),
    };
  });

  return Response.json({ shops, canWrite: session.user.role === "owner" });
}
