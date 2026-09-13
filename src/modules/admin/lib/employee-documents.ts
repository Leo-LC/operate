// Client-safe constants for employee documents (no Node imports —
// safe to import from client components).
export const MAX_DOCS_PER_EMPLOYEE = 3;
export const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_PDF_MIMES = ["application/pdf"];
export const ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_PDF_MIMES];

export const DOC_TYPES = ["id_card", "passport", "work_permit", "contract", "other"] as const;
export type EmployeeDocType = (typeof DOC_TYPES)[number];
