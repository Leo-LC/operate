"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PillButton } from "@/components/ui/pill-button";
import { ShopCard } from "@/modules/directory/components/ShopCard";
import { SupplierDrawer } from "@/modules/directory/components/SupplierDrawer";
import { SupplierTable } from "@/modules/directory/components/SupplierTable";
import type {
  DirectoryShop,
  DirectorySupplier,
  DirectoryTab,
} from "@/modules/directory/types";

interface Props {
  initialShops: DirectoryShop[];
  initialSuppliers: DirectorySupplier[];
  canWrite: boolean;
  initialTab: DirectoryTab;
  initialQuery: string;
  initialSelect: string;
}

function matchesShop(s: DirectoryShop, q: string): boolean {
  return [s.name, s.phone, s.line_id, s.address_en, s.address_th, s.tax_id, s.company_name_th, s.manager_name]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(q));
}

function matchesSupplier(s: DirectorySupplier, q: string): boolean {
  const fields = [s.name, s.company, s.company_name_th, s.phone, s.line_id, s.email, s.tax_id, s.address, ...s.location_names];
  if (fields.filter(Boolean).some((v) => (v as string).toLowerCase().includes(q))) return true;
  return s.products.some((p) => p.product_name.toLowerCase().includes(q));
}

export function DirectoryClient({
  initialShops,
  initialSuppliers,
  canWrite,
  initialTab,
  initialQuery,
  initialSelect,
}: Props) {
  const [shops, setShops] = useState(initialShops);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [tab, setTab] = useState<DirectoryTab>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelect || null);

  const filteredShops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((s) => matchesShop(s, q));
  }, [shops, query]);

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => matchesSupplier(s, q));
  }, [suppliers, query]);

  async function refreshSuppliers() {
    const res = await fetch("/api/directory/suppliers", { cache: "no-store" });
    if (!res.ok) return;
    const j = await res.json();
    setSuppliers((j as { suppliers: DirectorySupplier[] }).suppliers ?? []);
  }

  const selected = selectedId ? suppliers.find((s) => s.id === selectedId) ?? null : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
      <PageHeader
        title="Directory"
        eyebrow="Knowledge"
        subtitle="Shops & suppliers — search, copy, done."
        actions={
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <SearchIcon style={{ position: "absolute", left: 10, width: 14, height: 14, color: "var(--fg-4)", pointerEvents: "none" }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shop, supplier, product…"
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
        }
      />

      <div style={{ display: "flex", gap: 8 }}>
        <PillButton active={tab === "shops"} onClick={() => setTab("shops")}>
          Shops ({filteredShops.length})
        </PillButton>
        <PillButton active={tab === "suppliers"} onClick={() => setTab("suppliers")}>
          Suppliers ({filteredSuppliers.length})
        </PillButton>
      </div>

      {tab === "shops" ? (
        filteredShops.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--fg-4)" }}>No shops found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {filteredShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                canWrite={canWrite}
                onSaved={(saved) => setShops((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))}
              />
            ))}
          </div>
        )
      ) : (
        <SupplierTable suppliers={filteredSuppliers} onSelect={(s) => setSelectedId(s.id)} />
      )}

      {selected && (
        <SupplierDrawer
          supplier={selected}
          canWrite={canWrite}
          onClose={() => setSelectedId(null)}
          onChanged={() => void refreshSuppliers()}
        />
      )}
    </div>
  );
}
