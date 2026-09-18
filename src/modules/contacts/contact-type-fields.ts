import type { ContactType } from "@/modules/contacts/types";

/**
 * Per-type field visibility for the contacts form.
 * A supplier doesn't need the same info as a bank or a vet —
 * the form (and supplier dossier) only show what's relevant.
 */
export interface TypeFieldConfig {
  /** Line ID + preferred channel */
  directChannel: boolean;
  /** Payment terms + lead time (purchasing info) */
  purchasing: boolean;
  /** Company (TH), Tax ID, branch, address (TH) */
  business: boolean;
  /** Linked locations */
  locations: boolean;
  /** Helper shown at the top of the form */
  hint: string;
}

export const CONTACT_TYPE_FIELDS: Record<ContactType, TypeFieldConfig> = {
  provider: {
    directChannel: true,
    purchasing: true,
    business: true,
    locations: true,
    hint: "Products & price history live in the supplier dossier (folder icon).",
  },
  bank: {
    directChannel: false,
    purchasing: false,
    business: true,
    locations: false,
    hint: "Phone, email and branch — that's usually all staff need for a bank.",
  },
  veterinarian: {
    directChannel: true,
    purchasing: false,
    business: false,
    locations: true,
    hint: "How to reach the vet fast, and for which shops.",
  },
  employee: {
    directChannel: false,
    purchasing: false,
    business: false,
    locations: true,
    hint: "Minimal record — full HR data lives in Employees.",
  },
  owner: {
    directChannel: false,
    purchasing: false,
    business: false,
    locations: true,
    hint: "Minimal record.",
  },
  other: {
    directChannel: true,
    purchasing: false,
    business: true,
    locations: true,
    hint: "Generic contact — fill in what's useful.",
  },
};
