import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { computeLastOrderedAt, computeLastOrders } from "@/modules/directory/lib/last-order";
import type {
  DirectorySupplier,
  SupplierOrder,
  SupplierProduct,
} from "@/modules/directory/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role);
  if (!hasModuleAccess(permissions, "contacts")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  const [{ data: contacts, error: cErr }, { data: products }, { data: orders }] = await Promise.all([
    supabase
      .from("contacts")
      .select(`*, contact_locations ( id, location_id, locations ( name ) )`)
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("contact_type", "supplier")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase.from("supplier_products").select("*").eq("organization_id", DEFAULT_ORG_ID),
    supabase
      .from("supplier_orders")
      .select("*")
      .eq("organization_id", DEFAULT_ORG_ID)
      .order("ordered_at", { ascending: false })
      .limit(2000),
  ]);
  if (cErr) return Response.json({ error: cErr.message }, { status: 500 });
  // supplier_* tables may not exist yet if the migration was not applied — degrade gracefully
  const productRows = (products ?? []) as SupplierProduct[];
  const orderRows = (orders ?? []) as SupplierOrder[];

  type CLRow = { id: string; location_id: string; locations: { name: string } | null };
  type CRow = Record<string, unknown> & {
    id: string;
    name: string;
    contact_locations: CLRow[] | null;
  };

  const suppliers: DirectorySupplier[] = ((contacts ?? []) as unknown as CRow[]).map((c) => {
    const cid = c.id;
    const cOrders = orderRows.filter((o) => o.contact_id === cid);
    const lastOrders = computeLastOrders(cOrders);
    const pick = (k: string): string | null => {
      const v = c[k];
      return typeof v === "string" && v.length > 0 ? v : null;
    };
    return {
      id: cid,
      name: c.name,
      company: pick("company"),
      company_name_th: pick("company_name_th"),
      email: typeof c.email === "string" ? (c.email as string).toLowerCase() || null : null,
      phone: pick("phone"),
      line_id: pick("line_id"),
      preferred_channel: pick("preferred_channel"),
      payment_terms: pick("payment_terms"),
      lead_time_days: typeof c.lead_time_days === "number" ? (c.lead_time_days as number) : null,
      address: pick("address"),
      address_th: pick("address_th"),
      tax_id: pick("tax_id"),
      branch: pick("branch"),
      notes: pick("notes"),
      location_names: (c.contact_locations ?? [])
        .map((cl) => cl.locations?.name ?? "")
        .filter(Boolean),
      products: productRows
        .filter((p) => p.contact_id === cid)
        .sort((a, b) => a.product_name.localeCompare(b.product_name)),
      lastOrders,
      lastOrderedAt: computeLastOrderedAt(cOrders),
    };
  });

  return Response.json({ suppliers, canWrite: session.user.role === "owner" });
}
