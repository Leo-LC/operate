"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import type { SupplierOrder, SupplierProduct } from "@/modules/directory/types";

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

/**
 * Supplier dossier: catalog + manual order log + price history.
 * Rendered inside the expanded contact row (employees-style panel),
 * so no drawer is needed.
 */
export function SupplierDossier({
  contactId,
  products,
  canWrite,
  onChanged,
}: {
  contactId: string;
  products: SupplierProduct[];
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState("");
  const [productUnit, setProductUnit] = useState("");
  const [orderProduct, setOrderProduct] = useState(products[0]?.product_name ?? "");
  const [orderPrice, setOrderPrice] = useState("");
  const [orderQty, setOrderQty] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/supplier-orders/${contactId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setOrders((j as { orders?: SupplierOrder[] }).orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [contactId]);

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
        body: JSON.stringify({ contact_id: contactId, product_name: productName.trim(), unit: productUnit.trim() || undefined }),
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
          contact_id: contactId,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
      {/* Products */}
      <section>
        <p className="eyebrow" style={{ color: "var(--fg-3)", fontWeight: 600, marginBottom: 8 }}>
          Products ({products.length})
        </p>
        {products.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {products.map((p) => (
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
              <input value={orderProduct} onChange={(e) => setOrderProduct(e.target.value)} placeholder="Milk" list={`products-${contactId}`} style={inputStyle} />
              <datalist id={`products-${contactId}`}>
                {products.map((p) => <option key={p.id} value={p.product_name} />)}
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
    </div>
  );
}
