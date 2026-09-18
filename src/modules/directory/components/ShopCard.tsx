"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PhoneIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/modules/directory/components/CopyButton";
import type { DirectoryShop } from "@/modules/directory/types";

const inputStyle: React.CSSProperties = {
  height: 32,
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--line)",
  background: "var(--bg-2)",
  padding: "0 var(--s-3)",
  fontSize: 13,
  color: "var(--fg)",
  outline: "none",
  width: "100%",
};

function ShopField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, minWidth: 0 }}>
      <span style={{ color: "var(--fg-4)", width: 72, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {value}
      </span>
      <CopyButton value={value} label={label} />
    </div>
  );
}

export function ShopCard({
  shop,
  canWrite,
  onSaved,
  highlight,
}: {
  shop: DirectoryShop;
  canWrite: boolean;
  onSaved: (shop: DirectoryShop) => void;
  highlight?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setForm({
      phone: shop.phone ?? "",
      address_en: shop.address_en ?? "",
      address_th: shop.address_th ?? "",
      company_name_th: shop.company_name_th ?? "",
      tax_id: shop.tax_id ?? "",
      branch: shop.branch ?? "",
      notes: shop.notes ?? "",
    });
    setEditOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/directory/shops/${shop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to save");
        return;
      }
      const saved = (await res.json()) as DirectoryShop;
      onSaved({ ...shop, ...saved });
      setEditOpen(false);
      toast.success("Shop updated");
    } finally {
      setSaving(false);
    }
  }

  function setField(field: string) {
    return (v: string) => setForm((p) => ({ ...p, [field]: v }));
  }

  /** Full tax invoice block, copied in one tap */
  function taxInvoiceText(): string {
    const lines = [
      shop.company_name_th,
      shop.address_th,
      shop.tax_id ? `Tax ID: ${shop.tax_id}` : null,
      shop.branch ? `Branch: ${shop.branch}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  }

  return (
    <>
      <Card
        style={{
          gap: 10,
          height: "100%",
          ...(highlight ? { borderColor: "var(--accent)", boxShadow: "0 0 0 1px var(--accent)" } : {}),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 15, flex: 1 }}>{shop.name}</strong>
          {canWrite && (
            <button
              type="button"
              onClick={openEdit}
              title="Edit shop"
              style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--r-sm)", border: "none", background: "transparent", color: "var(--fg-4)", cursor: "pointer" }}
            >
              <PencilIcon size={13} />
            </button>
          )}
        </div>

        {shop.phone && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href={`tel:${shop.phone}`} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg)", textDecoration: "none" }}>
              <PhoneIcon size={13} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{shop.phone}</span>
              <CopyButton value={shop.phone} label="Phone" />
            </a>
          </div>
        )}

        {(shop.address_en || shop.address_th) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            <span className="eyebrow" style={{ color: "var(--fg-4)" }}>Address</span>
            {shop.address_en && <Row label="EN" value={shop.address_en} />}
            {shop.address_th && <Row label="TH" value={shop.address_th} />}
          </div>
        )}

        {(shop.company_name_th || shop.tax_id || shop.branch) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="eyebrow" style={{ color: "var(--fg-4)", flex: 1 }}>Tax invoice</span>
              <CopyButton value={taxInvoiceText()} label="Full tax invoice" />
            </div>
            {shop.company_name_th && <div style={{ fontSize: 12.5, color: "var(--fg)" }}>{shop.company_name_th}</div>}
            {shop.address_th && <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{shop.address_th}</div>}
            {(shop.tax_id || shop.branch) && (
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
                {[shop.tax_id ? `Tax ID: ${shop.tax_id}` : null, shop.branch ? `Branch: ${shop.branch}` : null].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        )}

        {!shop.phone && !shop.address_en && !shop.tax_id && (
          <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>
            No details yet{canWrite ? " — click edit to fill in." : "."}
          </p>
        )}
      </Card>

      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit ${shop.name}`}
        description="Shop directory details"
        footer={
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" size="sm" form="shop-form" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        }
      >
        <form id="shop-form" onSubmit={(e) => void save(e)} style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
          <ShopField label="Phone" value={form.phone ?? ""} placeholder="+66 …" onChange={setField("phone")} />
          <ShopField label="Address (EN)" value={form.address_en ?? ""} placeholder="Street address" onChange={setField("address_en")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Address (TH)</label>
            <textarea value={form.address_th ?? ""} rows={2} onChange={(e) => setForm((p) => ({ ...p, address_th: e.target.value }))} style={{ ...inputStyle, height: "auto", padding: "var(--s-2) var(--s-3)", resize: "none", fontFamily: "var(--font-sans)" }} />
          </div>
          <ShopField label="Company name (TH) — tax invoice" value={form.company_name_th ?? ""} placeholder="บริษัท … จำกัด" onChange={setField("company_name_th")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
            <ShopField label="Tax ID" value={form.tax_id ?? ""} placeholder="0000000000000" onChange={setField("tax_id")} />
            <ShopField label="Branch" value={form.branch ?? ""} placeholder="Head Office" onChange={setField("branch")} />
          </div>
        </form>
      </Drawer>
    </>
  );
}
