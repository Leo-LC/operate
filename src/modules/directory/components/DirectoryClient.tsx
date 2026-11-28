"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, StoreIcon, UsersIcon, XIcon } from "lucide-react";
import { ControlledTabs } from "@/components/ui/module-tabs";
import { TableScrollAffordance } from "@/components/ui/table-scroll-affordance";
import { ContactsClient } from "@/modules/contacts/components/ContactsClient";
import type { Contact } from "@/modules/contacts/types";
import { ShopTable } from "@/modules/directory/components/ShopTable";
import { SupplierDossier } from "@/modules/directory/components/SupplierDossier";
import type {
  DirectoryShop,
  DirectorySupplier,
  DirectoryTab,
} from "@/modules/directory/types";

interface LocationOption {
  id: string;
  name: string;
}

interface Props {
  initialShops: DirectoryShop[];
  initialSuppliers: DirectorySupplier[];
  initialContacts: Contact[];
  locations: LocationOption[];
  canWrite: boolean;
  initialTab: DirectoryTab;
  initialQuery: string;
  initialSelect: string;
}

const TABS: { value: DirectoryTab; label: string; icon: typeof StoreIcon }[] = [
  { value: "shops", label: "Shops", icon: StoreIcon },
  { value: "contacts", label: "Contacts", icon: UsersIcon },
];

export function DirectoryClient({
  initialShops,
  initialSuppliers,
  initialContacts,
  locations,
  canWrite,
  initialTab,
  initialQuery,
  initialSelect,
}: Props) {
  const [shops, setShops] = useState(initialShops);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [contacts, setContacts] = useState(initialContacts);
  const [tab, setTab] = useState<DirectoryTab>(initialTab);
  const [query, setQuery] = useState(initialQuery);

  /* Shops are always alphabetical and never filtered by the searchbar */
  const sortedShops = useMemo(
    () => [...shops].sort((a, b) => a.name.localeCompare(b.name)),
    [shops],
  );

  const supplierById = useMemo(() => {
    const map: Record<string, DirectorySupplier> = {};
    for (const s of suppliers) map[s.id] = s;
    return map;
  }, [suppliers]);

  function switchTab(next: DirectoryTab) {
    setTab(next);
    // Switching tabs always clears the search — no stale filter
    setQuery("");
  }

  async function refreshSuppliers() {
    const res = await fetch("/api/directory/suppliers", { cache: "no-store" });
    if (!res.ok) return;
    const j = await res.json();
    setSuppliers((j as { suppliers: DirectorySupplier[] }).suppliers ?? []);
  }

  async function refreshContacts() {
    const res = await fetch("/api/contacts", { cache: "no-store" });
    if (!res.ok) return;
    const rows = (await res.json()) as {
      id: string; organization_id: string; name: string; contact_type: string;
      company: string | null; company_name_th: string | null;
      email: string | null; phone: string | null;
      line_id: string | null; preferred_channel: string | null;
      payment_terms: string | null; lead_time_days: number | null;
      address: string | null; address_th: string | null;
      tax_id: string | null; branch: string | null;
      notes: string | null; created_by: string | null;
      created_at: string; updated_at: string;
      contact_locations: { id: string; location_id: string; locations: { name: string } | null }[] | null;
    }[];
    setContacts(
      rows.map((c) => ({
        ...c,
        line_id: c.line_id ?? null,
        preferred_channel: c.preferred_channel ?? null,
        payment_terms: c.payment_terms ?? null,
        lead_time_days: c.lead_time_days ?? null,
        contact_locations: (c.contact_locations ?? []).map((cl) => ({
          id: cl.id,
          location_id: cl.location_id,
          location_name: cl.locations?.name ?? cl.location_id,
        })),
      })),
    );
  }

  function handleSupplierChanged() {
    void refreshSuppliers();
    void refreshContacts();
  }

  return (
    <div className="directory">
      <TableScrollAffordance />
      <div className="ui-module-header">
        <nav aria-label="Breadcrumb">
          <ol className="ui-breadcrumb">
            <li>
              <Link href="/directory">Directory</Link>
              <span className="ui-breadcrumb-sep" aria-hidden> / </span>
            </li>
            <li>
              <span aria-current="page">{tab === "shops" ? "Shops" : "Contacts"}</span>
            </li>
          </ol>
        </nav>
        <div className="ui-module-header-row">
          <h1 className="ui-module-title">Directory</h1>
          <ControlledTabs
            variant="pills"
            tabs={TABS.map((t) => ({
              value: t.value,
              label: `${t.label} (${t.value === "shops" ? sortedShops.length : contacts.length})`,
              icon: t.icon,
              visibilityKey: `tab:directory.${t.value}`,
            }))}
            value={tab}
            onChange={(v) => switchTab(v as DirectoryTab)}
            ariaLabel="Directory"
          />
        </div>
      </div>

      {/* Search only filters contacts — never shops, so it only exists on that tab. */}
      {tab === "contacts" && (
        <div className="ui-toolbar">
          <div className="ui-filter-rows">
            <div className="ui-filter-row">
              <span className="ui-filter-label" id="directory-search-label">
                Recherche
              </span>
              <div className="ui-filter-control" role="group" aria-labelledby="directory-search-label">
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center", width: "min(320px, 100%)" }}>
                  <SearchIcon style={{ position: "absolute", left: 10, width: 14, height: 14, color: "var(--fg-4)", pointerEvents: "none" }} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
                    placeholder="Search contacts…"
                    aria-label="Search contacts"
                    autoFocus={query.length > 0}
                    style={{
                      height: "var(--ui-control-h)",
                      paddingLeft: 32,
                      paddingRight: query ? 32 : "var(--s-3)",
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                      color: "var(--fg)",
                      fontSize: 13,
                      width: "100%",
                      outline: "none",
                    }}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      title="Clear search"
                      aria-label="Clear search"
                      style={{
                        position: "absolute",
                        right: 6,
                        width: 24,
                        height: 24,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "var(--r-sm)",
                        border: "none",
                        background: "transparent",
                        color: "var(--fg-4)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-4)")}
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "shops" ? (
        <ShopTable
          shops={sortedShops}
          canWrite={canWrite}
          initialExpandId={initialTab === "shops" ? initialSelect || null : null}
          onSaved={(saved) => setShops((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))}
        />
      ) : (
        <ContactsClient
          initialContacts={contacts}
          locations={locations}
          canWrite={canWrite}
          filterQuery={query}
          initialExpandId={initialTab === "contacts" ? initialSelect || null : null}
          renderDossier={(contactId) => {
            const supplier = supplierById[contactId];
            if (!supplier) return null;
            return (
              <SupplierDossier
                contactId={contactId}
                products={supplier.products}
                canWrite={canWrite}
                onChanged={handleSupplierChanged}
              />
            );
          }}
        />
      )}
    </div>
  );
}
