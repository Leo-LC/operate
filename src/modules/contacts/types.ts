export const CONTACT_TYPES = [
  "employee",
  "provider",
  "bank",
  "owner",
  "veterinarian",
  "other",
] as const;

export type ContactType = typeof CONTACT_TYPES[number];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  employee: "Employee",
  provider: "Provider",
  bank: "Bank",
  owner: "Owner",
  veterinarian: "Veterinarian",
  other: "Other",
};

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
