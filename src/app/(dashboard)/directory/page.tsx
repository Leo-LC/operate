import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import { DirectoryClient } from "@/modules/directory/components/DirectoryClient";
import { computeLastOrderedAt, computeLastOrders } from "@/modules/directory/lib/last-order";
import type { Contact, ContactLocationRow } from "@/modules/contacts/types";
import type {
  DirectoryShop,
  DirectorySupplier,
  DirectoryTab,
  SupplierOrder,
  SupplierProduct,
} from "@/modules/directory/types";

function pick(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams?: { tab?: string; q?: string; select?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  headers();

  const supabase = getSupabaseServerClient();
  const [locRes, contactRes, productRes, orderRes] = await Promise.all([
    supabase
      .from("locations")
      .select("*")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("contacts")
      .select(`*, contact_locations ( id, location_id, locations ( name ) )`)
      .eq("organization_id", DEFAULT_ORG_ID)
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

  const shops: DirectoryShop[] = ((locRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: typeof row.slug === "string" ? row.slug : "",
    is_active: row.is_active !== false,
    phone: pick(row, "phone"),
    line_id: pick(row, "line_id"),
    address_en: pick(row, "address_en"),
    address_th: pick(row, "address_th"),
    company_name_th: pick(row, "company_name_th"),
    tax_id: pick(row, "tax_id"),
    branch: pick(row, "branch"),
    opening_hours: pick(row, "opening_hours"),
    manager_name: pick(row, "manager_name"),
    notes: pick(row, "notes"),
  }));

  type CLRow = { id: string; location_id: string; locations: { name: string } | null };
  type CRow = Record<string, unknown> & {
    id: string;
    name: string;
    contact_type: Contact["contact_type"];
    contact_locations: CLRow[] | null;
  };
  const productRows = (productRes.data ?? []) as SupplierProduct[];
  const orderRows = (orderRes.data ?? []) as SupplierOrder[];
  const contactRows = ((contactRes.data ?? []) as unknown) as CRow[];

  const toContact = (c: CRow): Contact => ({
    id: c.id,
    organization_id: DEFAULT_ORG_ID,
    name: c.name,
    contact_type: c.contact_type,
    company: pick(c, "company"),
    company_name_th: pick(c, "company_name_th"),
    email: pick(c, "email")?.toLowerCase() ?? null,
    phone: pick(c, "phone"),
    line_id: pick(c, "line_id"),
    preferred_channel: pick(c, "preferred_channel"),
    payment_terms: pick(c, "payment_terms"),
    lead_time_days: typeof c.lead_time_days === "number" ? (c.lead_time_days as number) : null,
    address: pick(c, "address"),
    address_th: pick(c, "address_th"),
    tax_id: pick(c, "tax_id"),
    branch: pick(c, "branch"),
    notes: pick(c, "notes"),
    created_by: typeof c.created_by === "string" ? (c.created_by as string) : null,
    created_at: typeof c.created_at === "string" ? (c.created_at as string) : "",
    updated_at: typeof c.updated_at === "string" ? (c.updated_at as string) : "",
    contact_locations: (c.contact_locations ?? []).map(
      (cl): ContactLocationRow => ({
        id: cl.id,
        location_id: cl.location_id,
        location_name: cl.locations?.name ?? cl.location_id,
      }),
    ),
  });

  const contacts: Contact[] = contactRows.map(toContact);

  const suppliers: DirectorySupplier[] = contactRows
    .filter((c) => c.contact_type === "supplier")
    .map((c) => {
      const full = toContact(c);
      const cOrders = orderRows.filter((o) => o.contact_id === c.id);
      return {
        ...full,
        location_names: (c.contact_locations ?? []).map((cl) => cl.locations?.name ?? "").filter(Boolean),
        products: productRows
          .filter((p) => p.contact_id === c.id)
          .sort((a, b) => a.product_name.localeCompare(b.product_name)),
        lastOrders: computeLastOrders(cOrders),
        lastOrderedAt: computeLastOrderedAt(cOrders),
      };
    });

  // tab=suppliers kept as an alias for back-compat (command palette links)
  const tabParam = searchParams?.tab;
  const tab: DirectoryTab = tabParam === "contacts" || tabParam === "suppliers" ? "contacts" : "shops";

  return (
    <DirectoryClient
      initialShops={shops}
      initialSuppliers={suppliers}
      initialContacts={contacts}
      locations={(locRes.data ?? []).map((l) => ({
        id: String((l as Record<string, unknown>).id),
        name: String((l as Record<string, unknown>).name ?? ""),
      }))}
      canWrite={session.user.role === "owner"}
      initialTab={tab}
      // The search query only ever filters contacts — never shops
      initialQuery={tab === "contacts" ? (searchParams?.q ?? "") : ""}
      initialSelect={searchParams?.select ?? ""}
    />
  );
}
