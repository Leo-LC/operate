"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PhoneIcon, MessageCircleIcon } from "lucide-react";
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
}: {
  shop: DirectoryShop;
  canWrite: boolean;
  onSaved: (shop: DirectoryShop) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setForm({
      phone: shop.phone ?? "",
      line_id: shop.line_id ?? "",
      address_en: shop.address_en ?? "",
      address_th: shop.address_th ?? "",
      company_name_th: shop.company_name_th ?? "",
      tax_id: shop.tax_id ?? "",
      branch: shop.branch ?? "",
      opening_hours: shop.opening_hours ?? "",
      manager_name: shop.manager_name ?? "",
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

  function Field({ label, field, placeholder }: { label: string; field: string; placeholder?: string }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</label>
        <input
          value={form[field] ?? ""}
          placeholder={placeholder}
          onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
          style={inputStyle}
        />
      </div>
    );
  }

  return (
    <>
      <Card style={{ gap: 10, height: "100%" }}>
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

        {(shop.phone || shop.line_id) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {shop.phone && (
              <a href={`tel:${shop.phone}`} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg)", textDecoration: "none" }}>
                <PhoneIcon size={13} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{shop.phone}</span>
                <CopyButton value={shop.phone} label="Phone" />
              </a>
            )}
            {shop.line_id && <Row label="Line" value={shop.line_id} />}
          </div>
        )}

        {(shop.address_en || shop.address_th) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            {shop.address_en && <Row label="Address" value={shop.address_en} />}
            {shop.address_th && (
              <div style={{ fontSize: 12, color: "var(--fg-3)", display: "flex", gap: 6 }}>
                <span style={{ flex: 1 }}>{shop.address_th}</span>
                <CopyButton value={shop.address_th} label="Thai address" />
              </div>
            )}
          </div>
        )}

        {(shop.company_name_th || shop.tax_id || shop.branch) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            <span className="eyebrow" style={{ color: "var(--fg-4)" }}>Tax invoice</span>
            {shop.company_name_th && <Row label="Company" value={shop.company_name_th} />}
            {shop.tax_id && <Row label="Tax ID" value={shop.tax_id} />}
            {shop.branch && <Row label="Branch" value={shop.branch} />}
          </div>
        )}

        {(shop.opening_hours || shop.manager_name) && (
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--fg-3)", borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            {shop.opening_hours && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>🕒 {shop.opening_hours}</span>
            )}
            {shop.manager_name && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>👤 {shop.manager_name}</span>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
            <Field label="Phone" field="phone" placeholder="+66 …" />
            <Field label="Line ID" field="line_id" placeholder="@shop…" />
          </div>
          <Field label="Address (EN)" field="address_en" placeholder="Street address" />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Address (TH)</label>
            <textarea value={form.address_th ?? ""} rows={2} onChange={(e) => setForm((p) => ({ ...p, address_th: e.target.value }))} style={{ ...inputStyle, height: "auto", padding: "var(--s-2) var(--s-3)", resize: "none", fontFamily: "var(--font-sans)" }} />
          </div>
          <Field label="Company name (TH) — tax invoice" field="company_name_th" placeholder="บริษัท … จำกัด" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
            <Field label="Tax ID" field="tax_id" placeholder="0000000000000" />
            <Field label="Branch" field="branch" placeholder="Head Office" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
            <Field label="Opening hours" field="opening_hours" placeholder="9:00 – 22:00" />
            <Field label="Manager" field="manager_name" placeholder="Name" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-4)" }}>
            <MessageCircleIcon size={12} /> Tip: keep Line ID without extra spaces so staff can copy-paste it.
          </div>
        </form>
      </Drawer>
    </>
  );
}
