import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { ContactsClient } from "@/modules/contacts/components/ContactsClient";
import type { Contact, ContactLocationRow } from "@/modules/contacts/types";
import { DEFAULT_ORG_ID } from "@/lib/constants";

export default async function ContactsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const canWrite = session.user.role === "owner";

  const supabase = getSupabaseServerClient();

  const [{ data: contactData }, { data: locData }] = await Promise.all([
    supabase
      .from("contacts")
      .select(`
        id, organization_id, name, contact_type, company, company_name_th,
        email, phone, address, address_th, tax_id, branch, notes,
        created_by, created_at, updated_at,
        contact_locations ( id, location_id, locations ( name ) )
      `)
      .eq("organization_id", DEFAULT_ORG_ID)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("locations")
      .select("id, name")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("is_active", true)
      .order("name"),
  ]);

  type CLRow = { id: string; location_id: string; locations: { name: string } | null };
  type CRow = {
    id: string; organization_id: string; name: string; contact_type: string;
    company: string | null; company_name_th: string | null;
    email: string | null; phone: string | null;
    address: string | null; address_th: string | null;
    tax_id: string | null; branch: string | null;
    notes: string | null; created_by: string | null;
    created_at: string; updated_at: string;
    contact_locations: CLRow[] | null;
  };

  const contacts: Contact[] = (contactData as unknown as CRow[] ?? []).map((c) => ({
    id: c.id,
    organization_id: c.organization_id,
    name: c.name,
    contact_type: c.contact_type as Contact["contact_type"],
    company: c.company,
    company_name_th: c.company_name_th,
    email: c.email,
    phone: c.phone,
    address: c.address,
    address_th: c.address_th,
    tax_id: c.tax_id,
    branch: c.branch,
    notes: c.notes,
    created_by: c.created_by,
    created_at: c.created_at,
    updated_at: c.updated_at,
    contact_locations: (c.contact_locations ?? []).map((cl): ContactLocationRow => ({
      id: cl.id,
      location_id: cl.location_id,
      location_name: cl.locations?.name ?? cl.location_id,
    })),
  }));

  return (
    <ContactsClient
      initialContacts={contacts}
      locations={locData ?? []}
      canWrite={canWrite}
    />
  );
}
