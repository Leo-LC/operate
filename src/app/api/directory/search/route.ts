import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { hasModuleAccess } from "@/core/permissions/guards";
import { getUserPermissionsFromDb } from "@/core/permissions/server";
import { DEFAULT_ORG_ID } from "@/lib/constants";
import type { DirectorySearchItem } from "@/modules/directory/types";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissions = await getUserPermissionsFromDb(session.user.userId, session.user.role);
  if (!hasModuleAccess(permissions, "contacts")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return Response.json({ items: [] });

  const supabase = getSupabaseServerClient();
  const like = `%${q}%`;
  const [shops, contacts, products] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .ilike("name", like)
      .limit(5),
    supabase
      .from("contacts")
      .select("id, name, company, phone")
      .eq("organization_id", DEFAULT_ORG_ID)
      .is("deleted_at", null)
      .or(`name.ilike.${like},company.ilike.${like},phone.ilike.${like}`)
      .limit(8),
    supabase
      .from("supplier_products")
      .select("id, contact_id, product_name, contacts ( name )")
      .eq("organization_id", DEFAULT_ORG_ID)
      .ilike("product_name", like)
      .limit(8),
  ]);

  const items: DirectorySearchItem[] = [];
  for (const s of shops.data ?? []) {
    items.push({
      kind: "shop",
      id: s.id as string,
      label: s.name as string,
      detail: "Shop",
      tab: "shops",
    });
  }
  for (const c of contacts.data ?? []) {
    items.push({
      kind: "supplier",
      id: c.id as string,
      label: c.name as string,
      detail: (c.company as string | null) ?? (c.phone as string | null),
      tab: "contacts",
    });
  }
  type PRow = {
    contact_id: string;
    product_name: string;
    contacts: { name: string } | null;
  };
  for (const p of (products.data ?? []) as unknown as PRow[]) {
    items.push({
      kind: "product",
      id: p.contact_id,
      label: p.product_name,
      detail: p.contacts?.name ?? null,
      tab: "contacts",
    });
  }
  return Response.json({ items: items.slice(0, 15) });
}
