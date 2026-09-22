// Thai bank account numbers are usually 10 digits, conventionally written
// XXX-X-XXXXX-X (e.g. 123-4-56789-0). Exception: GSB (Government Savings Bank)
// uses 12 digits with no dashes (e.g. 123456789012).
// The DB stores digits only; this helper formats for display and input.

const GROUP_SIZES = [3, 1, 5, 1] as const;
export const THAI_BANK_ACCOUNT_DIGITS = 10;
export const GSB_BANK_ACCOUNT_DIGITS = 12;
export const THAI_BANK_ACCOUNT_PLACEHOLDER = "123-4-56789-0";
export const GSB_BANK_ACCOUNT_PLACEHOLDER = "123456789012";

/** True for GSB, including the legacy long label "Government Savings Bank". */
export function isGsbBank(bankName: string | null | undefined): boolean {
  if (!bankName) return false;
  const n = bankName.trim().toLowerCase();
  return n === "gsb" || n.includes("gsb") || n.includes("government savings");
}

/** Expected digit count: 12 for GSB, 10 otherwise. */
export function getBankAccountDigits(bankName?: string | null): number {
  return isGsbBank(bankName) ? GSB_BANK_ACCOUNT_DIGITS : THAI_BANK_ACCOUNT_DIGITS;
}

export function getBankAccountPlaceholder(bankName?: string | null): string {
  return isGsbBank(bankName) ? GSB_BANK_ACCOUNT_PLACEHOLDER : THAI_BANK_ACCOUNT_PLACEHOLDER;
}

/** Keep digits only, capped at 10 (12 for GSB). Legacy rows with more digits are truncated. */
export function normalizeThaiBankAccountDigits(
  value: string | null | undefined,
  bankName?: string | null,
): string {
  return (value ?? "").replace(/\D/g, "").slice(0, getBankAccountDigits(bankName));
}

/**
 * Format digits for display/input.
 * - GSB: plain 12 digits, no dashes.
 * - Others: progressively formatted as XXX-X-XXXXX-X. Partial input stays readable.
 */
export function formatThaiBankAccount(value: string | null | undefined, bankName?: string | null): string {
  const digits = normalizeThaiBankAccountDigits(value, bankName);
  if (!digits) return "";
  if (isGsbBank(bankName)) return digits;
  const groups: string[] = [];
  let i = 0;
  for (const size of GROUP_SIZES) {
    if (i >= digits.length) break;
    groups.push(digits.slice(i, i + size));
    i += size;
  }
  return groups.join("-");
}

/** True when the value holds a complete account number (12 digits GSB, 10 otherwise). */
export function isCompleteThaiBankAccount(value: string | null | undefined, bankName?: string | null): boolean {
  return normalizeThaiBankAccountDigits(value, bankName).length === getBankAccountDigits(bankName);
}
