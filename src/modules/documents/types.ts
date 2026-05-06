export type DocumentStatus =
  | "valid"
  | "expiring"
  | "expired"
  | "missing"
  | "to_review"
  | "replaced"
  | "archived";

export type DocumentType =
  | "permit"
  | "license"
  | "certificate"
  | "contract"
  | "insurance"
  | "health"
  | "legal"
  | "hr"
  | "other";

export interface Document {
  id: string;
  organization_id: string;
  location_id: string | null;
  location_name: string | null;
  title: string;
  thai_form_name: string | null;
  document_type: DocumentType;
  status: DocumentStatus;
  code: string | null;
  category: string | null;
  authority: string | null;
  frequency: string | null;
  is_relevant: boolean;
  has_document: boolean;
  drive_url: string | null;
  issued_at: string | null;
  expires_at: string | null;
  reminder_days_override: number | null;
  responsible_person: string | null;
  notes: string | null;
  shop_notes: string | null;
  last_checked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentUpsert = Omit<
  Document,
  "id" | "organization_id" | "location_name" | "created_at" | "updated_at" | "created_by"
>;

/** Compute display status from expires_at when status is 'valid', 'expiring', or 'expired'. */
export function computeStatus(doc: Pick<Document, "status" | "expires_at">): DocumentStatus {
  if (doc.status !== "valid" && doc.status !== "expiring" && doc.status !== "expired") {
    return doc.status;
  }
  if (!doc.expires_at) return "valid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(doc.expires_at);
  if (expiry < today) return "expired";
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (expiry <= thirtyDays) return "expiring";
  return "valid";
}

/** Return days until expiry (negative = overdue). null if no expiry date. */
export function daysUntilExpiry(expires_at: string | null): number | null {
  if (!expires_at) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expires_at);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  permit: "Permit",
  license: "License",
  certificate: "Certificate",
  contract: "Contract",
  insurance: "Insurance",
  health: "Health",
  legal: "Legal",
  hr: "HR",
  other: "Other",
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  valid: "Valid",
  expiring: "Expiring soon",
  expired: "Expired",
  missing: "Missing",
  to_review: "To review",
  replaced: "Replaced",
  archived: "Archived",
};

export const STATUS_CLASSES: Record<DocumentStatus, string> = {
  valid:
    "bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-[var(--success)]",
  expiring:
    "bg-[color-mix(in_oklch,var(--amber,#f59e0b)_15%,transparent)] text-amber-600",
  expired:
    "bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] text-[var(--destructive)]",
  missing:
    "bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] text-[var(--destructive)]",
  to_review:
    "bg-muted text-muted-foreground",
  replaced:
    "bg-muted text-muted-foreground",
  archived:
    "bg-muted text-muted-foreground/60",
};
