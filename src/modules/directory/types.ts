export interface DirectoryShop {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  phone: string | null;
  line_id: string | null;
  address_en: string | null;
  address_th: string | null;
  company_name_th: string | null;
  tax_id: string | null;
  branch: string | null;
  opening_hours: string | null;
  manager_name: string | null;
  notes: string | null;
}

export interface SupplierProduct {
  id: string;
  contact_id: string;
  product_name: string;
  unit: string | null;
  notes: string | null;
}

export interface SupplierOrder {
  id: string;
  contact_id: string;
  product_name: string;
  qty: number | null;
  unit: string | null;
  unit_price: number;
  total: number | null;
  ordered_at: string;
  notes: string | null;
}

export interface LastOrderInfo {
  product_name: string;
  unit_price: number;
  unit: string | null;
  ordered_at: string;
}

export interface DirectorySupplier {
  id: string;
  name: string;
  company: string | null;
  company_name_th: string | null;
  email: string | null;
  phone: string | null;
  line_id: string | null;
  preferred_channel: string | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  address: string | null;
  address_th: string | null;
  tax_id: string | null;
  branch: string | null;
  notes: string | null;
  location_names: string[];
  products: SupplierProduct[];
  lastOrders: LastOrderInfo[];
  lastOrderedAt: string | null;
}

export type DirectoryTab = "shops" | "contacts";

export interface DirectorySearchItem {
  kind: "shop" | "supplier" | "product";
  id: string;
  label: string;
  detail: string | null;
  tab: DirectoryTab;
}
