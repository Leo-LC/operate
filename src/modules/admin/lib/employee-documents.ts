// Client-safe constants for employee documents (no Node imports —
// safe to import from client components).
export const MAX_DOCS_PER_EMPLOYEE = 10;
export const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_PDF_MIMES = ["application/pdf"];
export const ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_PDF_MIMES];

/** Client-side compression target (mirrored from the old sharp pipeline). */
export const MAX_DIMENSION = 1600;
export const WEBP_QUALITY = 0.78;

/** Metadata-only file check (no bytes read) — usable client + server. */
export function validateFileMeta(meta: { type: string; size: number }): { ok: boolean; error?: string } {
  if (!ALLOWED_MIMES.includes(meta.type)) {
    return { ok: false, error: `Unsupported file type: ${meta.type || "unknown"}. Allowed: PDF, JPEG, PNG, WebP` };
  }
  if (meta.size > MAX_SIZE_BYTES) {
    return { ok: false, error: `File too large: ${(meta.size / 1024 / 1024).toFixed(1)}MB. Max 8MB` };
  }
  if (meta.size <= 0) {
    return { ok: false, error: "File is empty" };
  }
  return { ok: true };
}

/** Storage path relative to the bucket (never include the bucket prefix). */
export function generateStoragePath(organizationId: string, employeeId: string, fileName: string): string {
  const uuid = crypto.randomUUID();
  const rawExt = fileName.split(".").pop() ?? "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  return `${organizationId}/${employeeId}/${uuid}.${ext}`;
}

/** Built-in document categories, shared by all employees. */
export const BUILTIN_DOC_TYPES = ["id_card", "passport", "work_permit", "contract"] as const;
export type BuiltinDocType = (typeof BUILTIN_DOC_TYPES)[number];

/** Legacy value kept for display only (rows created when "Other" existed). */
export const LEGACY_OTHER_DOC_TYPE = "other";

/** Backwards-compat alias (includes legacy "other"). Prefer BUILTIN_DOC_TYPES. */
export const DOC_TYPES = [...BUILTIN_DOC_TYPES, LEGACY_OTHER_DOC_TYPE] as const;
export type EmployeeDocType = string;

export const BUILTIN_DOC_TYPE_LABELS: Record<BuiltinDocType, string> = {
  id_card: "ID card",
  passport: "Passport",
  work_permit: "Work permit",
  contract: "Contract",
};

/** Turn a free-form label into a DB-safe slug: "House Registration" -> "house_registration". */
export function slugifyDocType(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

/** A custom slug is valid when it looks like one and isn't a builtin/legacy value. */
export function isValidCustomDocTypeSlug(slug: string): boolean {
  if (!/^[a-z0-9_]{2,32}$/.test(slug)) return false;
  return !(BUILTIN_DOC_TYPES as readonly string[]).includes(slug) && slug !== LEGACY_OTHER_DOC_TYPE;
}

/** Accepts builtins, legacy "other" rows, and valid custom slugs. */
export function isKnownDocType(value: string): boolean {
  if ((BUILTIN_DOC_TYPES as readonly string[]).includes(value)) return true;
  if (value === LEGACY_OTHER_DOC_TYPE) return true;
  return isValidCustomDocTypeSlug(value);
}

/** Display label: builtin map, "Other" for legacy rows, prettified slug for customs. */
export function prettifyDocType(slug: string): string {
  return slug
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function getDocTypeLabel(value: string): string {
  const builtin = (BUILTIN_DOC_TYPE_LABELS as Record<string, string>)[value];
  if (builtin) return builtin;
  if (value === LEGACY_OTHER_DOC_TYPE) return "Other";
  return prettifyDocType(value);
}
