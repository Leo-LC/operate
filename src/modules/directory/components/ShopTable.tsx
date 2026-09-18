"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PencilIcon, ChevronDownIcon } from "lucide-react";
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

function ViewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 120 }}>
      <span className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--fg)" }}>{children}</span>
    </div>
  );
}

/**
 * Shops table with employees-style expandable rows:
 * click a row → read-only panel, Edit button → inline form.
 */
export function ShopTable({
  shops,
  canWrite,
  onSaved,
  initialExpandId,
}: {
  shops: DirectoryShop[];
  canWrite: boolean;
  onSaved: (shop: DirectoryShop) => void;
  initialExpandId?: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mountedId, setMountedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement | null>());

  useEffect(() => () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }, []);

  /* Deep link (command palette): open the matching shop */
  useEffect(() => {
    if (initialExpandId && shops.some((s) => s.id === initialExpandId)) {
      setMountedId(initialExpandId);
      setExpandedId(initialExpandId);
      requestAnimationFrame(() => requestAnimationFrame(() => setPanelOpen(true)));
      window.setTimeout(() => {
        rowRefs.current.get(initialExpandId)?.scrollIntoView({ block: "start" });
      }, 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function expand(id: string) {
    if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; }
    const alreadyExpanded = expandedId === id;
    setMountedId(id);
    setExpandedId(id);
    if (!alreadyExpanded || !panelOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setPanelOpen(true)));
    }
  }

  function collapse() {
    setPanelOpen(false);
    setExpandedId(null);
    setEditingId(null);
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => { setMountedId(null); collapseTimer.current = null; }, 260);
  }

  function toggleRow(shop: DirectoryShop) {
    if (expandedId === shop.id) {
      collapse();
    } else {
      expand(shop.id);
      window.setTimeout(() => {
        rowRefs.current.get(shop.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }

  function startEdit(shop: DirectoryShop) {
    setForm({
      phone: shop.phone ?? "",
      address_en: shop.address_en ?? "",
      address_th: shop.address_th ?? "",
      company_name_th: shop.company_name_th ?? "",
      tax_id: shop.tax_id ?? "",
      branch: shop.branch ?? "",
      notes: shop.notes ?? "",
    });
    setEditingId(shop.id);
  }

  function setField(field: string) {
    return (v: string) => setForm((p) => ({ ...p, [field]: v }));
  }

  async function save(e: React.FormEvent, shop: DirectoryShop) {
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
      setEditingId(null);
      toast.success("Shop updated");
    } finally {
      setSaving(false);
    }
  }

  /** Full tax invoice block, copied in one tap */
  function taxInvoiceText(shop: DirectoryShop): string {
    return [
      shop.company_name_th,
      shop.address_th,
      shop.tax_id ? `Tax ID: ${shop.tax_id}` : null,
      shop.branch ? `Branch: ${shop.branch}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (shops.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--fg-4)" }}>No shops found.</p>;
  }

  return (
    <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", overflow: "hidden" }}>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead style={{ background: "transparent" }}>
          <tr>
            {["Shop", "Phone", "Address", "Tax ID"].map((h, i) => (
              <th key={i} className="eyebrow" style={{ padding: "10px 16px", textAlign: "left", color: "var(--fg-4)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shops.map((shop) => {
            const isExpanded = expandedId === shop.id;
            const isMounted = mountedId === shop.id;
            const isEditing = editingId === shop.id;
            return (
              <React.Fragment key={shop.id}>
                <tr
                  ref={(el) => { rowRefs.current.set(shop.id, el); }}
                  onClick={() => toggleRow(shop)}
                  onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "var(--row-hover)"; }}
                  onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                  title={isExpanded ? "Click to collapse" : "Click to view"}
                  style={{
                    background: isExpanded ? "var(--accent-soft)" : "transparent",
                    borderTop: "1px solid var(--line)",
                    cursor: "pointer",
                    transition: "background 150ms",
                    scrollMarginTop: "calc(var(--topbar-h) + 12px)",
                  }}
                >
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--fg)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <ChevronDownIcon size={13} style={{ color: "var(--fg-4)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 150ms", flexShrink: 0 }} />
                      {shop.name}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                    {shop.phone ?? <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                    {shop.address_en ?? <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }}>
                    {shop.tax_id ?? <span style={{ color: "var(--fg-4)" }}>—</span>}
                  </td>
                </tr>
                {isMounted && (
                  <tr>
                    <td colSpan={4} style={{ padding: 0, border: 0 }}>
                      <div className="emp-accordion" data-open={isExpanded && panelOpen ? "true" : "false"}>
                        <div className="emp-accordion-inner">
                          <div style={{ padding: "0 16px 12px", background: "var(--accent-soft)" }}>
                            {isEditing ? (
                              <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 16 }}>
                                <form id={`shop-form-${shop.id}`} onSubmit={(e) => void save(e, shop)} style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
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
                                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)} disabled={saving}>Cancel</Button>
                                  <Button type="submit" size="sm" form={`shop-form-${shop.id}`} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ borderRadius: "var(--r-lg)", border: "1px solid var(--line)", background: "var(--surface)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                    <ViewField label="Shop">{shop.name}</ViewField>
                                    {shop.phone && <ViewField label="Phone"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{shop.phone}<CopyButton value={shop.phone} label="Phone" /></span></ViewField>}
                                  </div>
                                </div>
                                {(shop.address_en || shop.address_th) && (
                                  <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
                                    <span className="eyebrow">Address</span>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: "var(--s-2)" }}>
                                      {shop.address_en && <ViewField label="EN"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{shop.address_en}<CopyButton value={shop.address_en} label="Address (EN)" /></span></ViewField>}
                                      {shop.address_th && <ViewField label="TH"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{shop.address_th}<CopyButton value={shop.address_th} label="Address (TH)" /></span></ViewField>}
                                    </div>
                                  </div>
                                )}
                                {(shop.company_name_th || shop.tax_id || shop.branch) && (
                                  <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
                                    <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                      Tax invoice
                                      <CopyButton value={taxInvoiceText(shop)} label="Full tax invoice" />
                                    </span>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: "var(--s-2)" }}>
                                      {shop.company_name_th && <ViewField label="Company">{shop.company_name_th}</ViewField>}
                                      {shop.address_th && <ViewField label="Address (TH)">{shop.address_th}</ViewField>}
                                      {shop.tax_id && <ViewField label="Tax ID">{shop.tax_id}</ViewField>}
                                      {shop.branch && <ViewField label="Branch">{shop.branch}</ViewField>}
                                    </div>
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: 8, paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)" }}>
                                  {canWrite && (
                                    <Button size="sm" onClick={() => startEdit(shop)}>
                                      <PencilIcon className="size-3.5" />
                                      Edit
                                    </Button>
                                  )}
                                  <Button size="sm" variant="secondary" onClick={collapse}>Close</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
