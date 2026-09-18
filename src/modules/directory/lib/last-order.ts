import type { LastOrderInfo, SupplierOrder } from "@/modules/directory/types";

/** Group orders by product and keep the most recent row per product. */
export function computeLastOrders(orders: SupplierOrder[]): LastOrderInfo[] {
  const byProduct = new Map<string, SupplierOrder>();
  for (const o of orders) {
    const key = o.product_name.trim().toLowerCase();
    const prev = byProduct.get(key);
    if (!prev || o.ordered_at >= prev.ordered_at) byProduct.set(key, o);
  }
  return Array.from(byProduct.values())
    .map((o) => ({
      product_name: o.product_name,
      unit_price: Number(o.unit_price),
      unit: o.unit,
      ordered_at: o.ordered_at,
    }))
    .sort((a, b) => b.ordered_at.localeCompare(a.ordered_at));
}

/** Most recent order date across all orders, or null. */
export function computeLastOrderedAt(orders: SupplierOrder[]): string | null {
  let latest: string | null = null;
  for (const o of orders) {
    if (!latest || o.ordered_at > latest) latest = o.ordered_at;
  }
  return latest;
}
