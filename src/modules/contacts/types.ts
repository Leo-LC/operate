export const CONTACT_TYPES = [
  "supplier",
  "bank",
  "owner",
  "veterinarian",
] as const;

export type PresetContactType = typeof CONTACT_TYPES[number];

/**
 * Contact types are free-form: the presets above plus custom types
 * created inline in the form (stored as lowercase strings).
 * Legacy rows (employee, provider, other) keep working as custom types.
 */
export type ContactType = string;

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  supplier: "Supplier",
  bank: "Bank",
  owner: "Owner",
  veterinarian: "Veterinarian",
};

export function contactTypeLabel(t: string): string {
  if (!t) return "—";
  return CONTACT_TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1);
}

export interface ContactLocationRow {
  id: string;
  location_id: string;
  location_name: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  name: string;
  contact_type: ContactType;
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
  created_by: string | null;
  created_at: string;
  updated_at: string;
  contact_locations?: ContactLocationRow[];
}
