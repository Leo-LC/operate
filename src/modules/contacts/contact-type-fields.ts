/**
 * Per-type field visibility for the contacts form.
 * A supplier doesn't need the same info as a bank or a vet —
 * the form only shows what's relevant. Unknown (custom) types
 * fall back to the generic config.
 */
export interface TypeFieldConfig {
  /** Line ID + preferred channel */
  directChannel: boolean;
  /** Company (TH), Tax ID, branch, Thai address */
  business: boolean;
  /** Linked locations */
  locations: boolean;
  /** Helper shown at the top of the form */
  hint: string;
}

const PRESETS: Record<string, TypeFieldConfig> = {
  supplier: {
    directChannel: true,
    business: true,
    locations: true,
    hint: "Catalog & order history appear in the expanded row below.",
  },
  bank: {
    directChannel: false,
    business: true,
    locations: false,
    hint: "Phone, email and branch — that's usually all staff need for a bank.",
  },
  veterinarian: {
    directChannel: true,
    business: false,
    locations: true,
    hint: "How to reach the vet fast, and for which shops.",
  },
  owner: {
    directChannel: false,
    business: false,
    locations: true,
    hint: "Minimal record.",
  },
};

const DEFAULT: TypeFieldConfig = {
  directChannel: true,
  business: true,
  locations: true,
  hint: "Generic contact — fill in what's useful.",
};

export function getContactTypeFields(t: string): TypeFieldConfig {
  return PRESETS[t] ?? DEFAULT;
}
