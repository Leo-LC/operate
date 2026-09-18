"use client";

import { useMemo, useState } from "react";
import { SearchIcon, StoreIcon, UsersIcon } from "lucide-react";
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

function matchesShop(s: DirectoryShop, q: string): boolean {
  return [s.name, s.phone, s.address_en, s.address_th, s.tax_id, s.company_name_th]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(q));
}

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
  const [contactsKey, setContactsKey] = useState(0);
  const [tab, setTab] = useState<DirectoryTab>(initialTab);
  const [query, setQuery] = useState(initialQuery);

  const filteredShops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((s) => matchesShop(s, q));
  }, [shops, query]);

  const supplierById = useMemo(() => {
    const map: Record<string, DirectorySupplier> = {};
    for (const s of suppliers) map[s.id] = s;
    return map;
  }, [suppliers]);

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
      id: string; organization_id: string; name: string; contact_type: Contact["contact_type"];
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
    // remount the contacts table so its internal state picks up the refresh
    setContactsKey((k) => k + 1);
  }

  function handleSupplierChanged() {
    void refreshSuppliers();
    void refreshContacts();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Search only — no page header */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <SearchIcon style={{ position: "absolute", left: 10, width: 14, height: 14, color: "var(--fg-4)", pointerEvents: "none" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shop, contact, product…"
            autoFocus={query.length > 0}
            style={{
              height: 36,
              paddingLeft: 32,
              paddingRight: "var(--s-3)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--fg)",
              fontSize: 13,
              width: 280,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Underline tabs — same styling as the Direction module */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", gap: 0, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.value;
          const count = t.value === "shops" ? filteredShops.length : contacts.length;
          return (
            <div key={t.value} style={{ display: "inline-flex", alignItems: "center", borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1 }}>
              <button
                type="button"
                onClick={() => setTab(t.value)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "0 var(--s-3)", height: 36, fontSize: 13, fontWeight: 500,
                  border: "none", background: "none", cursor: "pointer",
                  color: isActive ? "var(--fg)" : "var(--fg-4)",
                  transition: "color var(--dur) var(--ease)", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--fg-2)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--fg-4)"; }}
              >
                <Icon size={14} />
                {t.label} ({count})
              </button>
            </div>
          );
        })}
      </div>

      {tab === "shops" ? (
        <ShopTable
          shops={filteredShops}
          canWrite={canWrite}
          initialExpandId={initialTab === "shops" ? initialSelect || null : null}
          onSaved={(saved) => setShops((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))}
        />
      ) : (
        <ContactsClient
          key={contactsKey}
          initialContacts={contacts}
          locations={locations}
          canWrite={canWrite}
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
