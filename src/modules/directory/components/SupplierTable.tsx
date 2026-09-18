"use client";

import { Pill } from "@/components/ui/pill";
import { CopyButton } from "@/modules/directory/components/CopyButton";
import type { DirectorySupplier } from "@/modules/directory/types";

function fmtPrice(n: number): string {
  return `฿${Number(n).toLocaleString()}`;
}

function fmtDate(d: string): string {
  const dObj = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dObj.getTime())) return d;
  return dObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function SupplierTable({
  suppliers,
  onSelect,
}: {
  suppliers: DirectorySupplier[];
  onSelect: (s: DirectorySupplier) => void;
}) {
  if (suppliers.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--fg-4)" }}>No suppliers found.</p>;
  }
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            {["Supplier", "Products", "Contact", "Last price", "Last order"].map((h) => (
              <th
                key={h}
                style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr
              key={s.id}
              onClick={() => onSelect(s)}
              style={{ borderBottom: "1px solid var(--line)", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--fg)" }}>
                <div>{s.name}</div>
                {s.company && <div style={{ fontWeight: 400, fontSize: 12, color: "var(--fg-3)" }}>{s.company}</div>}
              </td>
              <td style={{ padding: "10px 16px" }}>
                {s.products.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {s.products.slice(0, 4).map((p) => (
                      <Pill key={p.id} tone="neutral" size="sm">{p.product_name}</Pill>
                    ))}
                    {s.products.length > 4 && <Pill tone="outline" size="sm">+{s.products.length - 4}</Pill>}
                  </div>
                ) : (
                  <span style={{ color: "var(--fg-4)", fontSize: 12 }}>—</span>
                )}
              </td>
              <td style={{ padding: "10px 16px", color: "var(--fg-3)", fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                {s.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{s.phone}</span>
                    <CopyButton value={s.phone} label="Phone" />
                  </div>
                )}
                {s.line_id && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span>Line: {s.line_id}</span>
                    <CopyButton value={s.line_id} label="Line ID" />
                  </div>
                )}
                {s.email && <div>{s.email}</div>}
                {!s.phone && !s.line_id && !s.email && <span style={{ color: "var(--fg-4)" }}>—</span>}
              </td>
              <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)" }}>
                {s.lastOrders.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {s.lastOrders.slice(0, 2).map((o) => (
                      <span key={o.product_name}>
                        {o.product_name} · <strong className="mono" style={{ color: "var(--fg)" }}>{fmtPrice(o.unit_price)}</strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>—</span>
                )}
              </td>
              <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--fg-3)" }}>
                {s.lastOrderedAt ? fmtDate(s.lastOrderedAt) : <span style={{ color: "var(--fg-4)" }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
