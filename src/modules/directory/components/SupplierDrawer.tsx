"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon, PencilIcon } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { CopyButton } from "@/modules/directory/components/CopyButton";
import type { DirectorySupplier, SupplierOrder, SupplierProduct } from "@/modules/directory/types";

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

function fmtDate(d: string): string {
  const dObj = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dObj.getTime())) return d;
  return dObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function SupplierDrawer({
  supplier,
  canWrite,
  onClose,
  onChanged,
}: {
  supplier: DirectorySupplier | null;
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState("");
  const [productUnit, setProductUnit] = useState("");
  const [orderProduct, setOrderProduct] = useState("");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderQty, setOrderQty] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<Record<string, string>>({});
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (!supplier) return;
    setOrders([]);
    setProductName("");
    setProductUnit("");
    setOrderProduct(supplier.products[0]?.product_name ?? "");
    setOrderPrice("");
    setOrderQty("");
    setEditingInfo(false);
    setLoading(true);
    fetch(`/api/supplier-orders/${supplier.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setOrders((j as { orders?: SupplierOrder[] }).orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [supplier]);

  if (!supplier) return null;

  async function addProduct() {
    if (!productName.trim()) {
      toast.error("Product name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/supplier-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: supplier!.id, product_name: productName.trim(), unit: productUnit.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to add product");
        return;
      }
      setProductName("");
      setProductUnit("");
      toast.success("Product added");
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteProduct(id: string) {
    const res = await fetch(`/api/supplier-products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Product deleted");
    onChanged();
  }

  async function addOrder() {
    if (!orderProduct.trim()) {
      toast.error("Product is required");
      return;
    }
    const price = Number(orderPrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/supplier-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: supplier!.id,
          product_name: orderProduct.trim(),
          unit_price: price,
          qty: orderQty.trim() ? Number(orderQty) : null,
          ordered_at: orderDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to log order");
        return;
      }
      const created = (await res.json()) as SupplierOrder;
      setOrders((prev) => [created, ...prev].sort((a, b) => b.ordered_at.localeCompare(a.ordered_at)));
      setOrderPrice("");
      setOrderQty("");
      toast.success("Order logged");
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteOrder(id: string) {
    const res = await fetch(`/api/supplier-orders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
    toast.success("Order deleted");
    onChanged();
  }

  const s = supplier;

  function openInfoEdit() {
    setInfoForm({
      name: s.name,
      company: s.company ?? "",
      phone: s.phone ?? "",
      line_id: s.line_id ?? "",
      email: s.email ?? "",
      preferred_channel: s.preferred_channel ?? "",
      payment_terms: s.payment_terms ?? "",
      lead_time_days: s.lead_time_days !== null ? String(s.lead_time_days) : "",
      address: s.address ?? "",
      address_th: s.address_th ?? "",
      company_name_th: s.company_name_th ?? "",
      tax_id: s.tax_id ?? "",
      branch: s.branch ?? "",
      notes: s.notes ?? "",
    });
    setEditingInfo(true);
  }

  async function saveInfo() {
    if (!infoForm.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    setSavingInfo(true);
    try {
      const payload: Record<string, string | number | null> = {};
      for (const [k, v] of Object.entries(infoForm)) {
        payload[k] = v.trim() === "" ? null : v.trim();
      }
      if (payload.email && typeof payload.email === "string") payload.email = payload.email.toLowerCase();
      payload.lead_time_days =
        infoForm.lead_time_days.trim() !== "" && Number.isFinite(Number(infoForm.lead_time_days))
          ? Number(infoForm.lead_time_days)
          : null;
      const res = await fetch(`/api/contacts/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to save");
        return;
      }
      setEditingInfo(false);
      toast.success("Supplier updated");
      onChanged();
    } finally {
      setSavingInfo(false);
    }
  }

  function InfoInput({ label, field, placeholder }: { label: string; field: string; placeholder?: string }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label className="eyebrow" style={{ color: "var(--fg-4)" }}>{label}</label>
        <input
          value={infoForm[field] ?? ""}
          placeholder={placeholder}
          onChange={(e) => setInfoForm((p) => ({ ...p, [field]: e.target.value }))}
          style={inputStyle}
        />
      </div>
    );
  }

  return (
    <Drawer open onClose={onClose} title={s.name} description={s.company ?? "Supplier"} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
        {canWrite && !editingInfo && (
          <div>
            <Button size="sm" variant="secondary" onClick={openInfoEdit} style={{ gap: 6 }}>
              <PencilIcon size={13} />Edit info
            </Button>
          </div>
        )}
        {editingInfo ? (
          <section>
            <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: 8 }}>Edit info</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <InfoInput label="Name *" field="name" />
              <InfoInput label="Company (EN)" field="company" />
              <InfoInput label="Phone" field="phone" placeholder="+66 …" />
              <InfoInput label="Line ID" field="line_id" placeholder="@supplier…" />
              <InfoInput label="Email" field="email" />
              <InfoInput label="Preferred channel" field="preferred_channel" placeholder="Line / Phone / Email" />
              <InfoInput label="Payment terms" field="payment_terms" placeholder="Cash / 30 days…" />
              <InfoInput label="Lead time (days)" field="lead_time_days" placeholder="3" />
              <div style={{ gridColumn: "span 2" }}>
                <InfoInput label="Address" field="address" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <InfoInput label="Company name (TH)" field="company_name_th" placeholder="บริษัท … จำกัด" />
              </div>
              <InfoInput label="Tax ID" field="tax_id" />
              <InfoInput label="Branch" field="branch" />
              <div style={{ gridColumn: "span 2" }}>
                <InfoInput label="Address (TH)" field="address_th" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" variant="secondary" onClick={() => setEditingInfo(false)} disabled={savingInfo}>Cancel</Button>
              <Button size="sm" onClick={() => void saveInfo()} disabled={savingInfo}>{savingInfo ? "Saving…" : "Save"}</Button>
            </div>
          </section>
        ) : (
        <>
        {/* Contact */}
        <section>
          <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: 8 }}>Contact</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            {s.phone && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "var(--fg-4)", width: 64 }}>Phone</span><span style={{ flex: 1 }}>{s.phone}</span><CopyButton value={s.phone} label="Phone" /></div>}
            {s.line_id && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "var(--fg-4)", width: 64 }}>Line</span><span style={{ flex: 1 }}>{s.line_id}</span><CopyButton value={s.line_id} label="Line ID" /></div>}
            {s.email && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: "var(--fg-4)", width: 64 }}>Email</span><span style={{ flex: 1 }}>{s.email}</span><CopyButton value={s.email} label="Email" /></div>}
            {s.preferred_channel && <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Preferred: {s.preferred_channel}</div>}
            {s.payment_terms && <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Payment: {s.payment_terms}</div>}
            {s.lead_time_days !== null && <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Lead time: {s.lead_time_days} day(s)</div>}
            {!s.phone && !s.line_id && !s.email && <span style={{ fontSize: 12, color: "var(--fg-4)" }}>No contact info yet.</span>}
          </div>
        </section>

        {/* Tax invoice */}
        {(s.company_name_th || s.tax_id || s.branch || s.address_th) && (
          <section>
            <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: 8 }}>Tax invoice</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              {s.company_name_th && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ flex: 1 }}>{s.company_name_th}</span><CopyButton value={s.company_name_th} label="Company (TH)" /></div>}
              {s.tax_id && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ flex: 1 }}>Tax ID: {s.tax_id}</span><CopyButton value={s.tax_id} label="Tax ID" /></div>}
              {s.branch && <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Branch: {s.branch}</div>}
              {s.address_th && <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{s.address_th}</div>}
            </div>
          </section>
        )}

        {/* Products */}
        <section>
          <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: 8 }}>
            Products ({s.products.length})
          </p>
          {s.products.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {s.products.map((p: SupplierProduct) => (
                <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Pill tone="neutral" size="sm">{p.unit ? `${p.product_name} · ${p.unit}` : p.product_name}</Pill>
                  {canWrite && (
                    <button type="button" onClick={() => void deleteProduct(p.id)} title="Remove product" style={{ border: "none", background: "transparent", color: "var(--fg-4)", cursor: "pointer", padding: 2 }}>
                      <Trash2Icon size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>No products listed yet.</p>
          )}
          {canWrite && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product name" style={{ ...inputStyle, flex: 2 }} />
              <input value={productUnit} onChange={(e) => setProductUnit(e.target.value)} placeholder="Unit (kg, L…)" style={{ ...inputStyle, flex: 1 }} />
              <Button size="sm" onClick={() => void addProduct()} disabled={submitting}>Add</Button>
            </div>
          )}
        </section>

        {/* Order history */}
        <section>
          <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: 8 }}>
            Order history{orders.length > 0 ? ` (${orders.length})` : ""}
          </p>
          {canWrite && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.7fr 1fr auto", gap: 8, marginBottom: 12, alignItems: "end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Product</label>
                <input value={orderProduct} onChange={(e) => setOrderProduct(e.target.value)} placeholder="Milk" list={`products-${s.id}`} style={inputStyle} />
                <datalist id={`products-${s.id}`}>
                  {s.products.map((p) => <option key={p.id} value={p.product_name} />)}
                </datalist>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Price ฿</label>
                <input value={orderPrice} onChange={(e) => setOrderPrice(e.target.value)} placeholder="62" inputMode="decimal" style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Qty</label>
                <input value={orderQty} onChange={(e) => setOrderQty(e.target.value)} placeholder="—" inputMode="decimal" style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label className="eyebrow" style={{ color: "var(--fg-4)" }}>Date</label>
                <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} style={inputStyle} />
              </div>
              <Button size="sm" onClick={() => void addOrder()} disabled={submitting}>Log</Button>
            </div>
          )}
          {loading ? (
            <p style={{ fontSize: 12, color: "var(--fg-4)" }}>Loading history…</p>
          ) : orders.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--fg-4)", margin: 0 }}>No orders logged yet.</p>
          ) : (
            <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Date", "Product", "Qty", "Unit price", canWrite ? "" : null].filter(Boolean).map((h) => (
                      <th key={String(h)} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 500, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{fmtDate(o.ordered_at)}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 500 }}>{o.product_name}</td>
                      <td style={{ padding: "8px 12px" }}>{o.qty ?? "—"}</td>
                      <td style={{ padding: "8px 12px" }} className="mono">฿{Number(o.unit_price).toLocaleString()}</td>
                      {canWrite && (
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <button type="button" onClick={() => void deleteOrder(o.id)} title="Delete entry" style={{ border: "none", background: "transparent", color: "var(--fg-4)", cursor: "pointer", padding: 2 }}>
                            <Trash2Icon size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {s.notes && (
          <section>
            <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: 8 }}>Notes</p>
            <p style={{ fontSize: 13, color: "var(--fg-3)", margin: 0, whiteSpace: "pre-wrap" }}>{s.notes}</p>
          </section>
        )}
        </>
        )}
      </div>
    </Drawer>
  );
}
