// Thai bank account numbers are 10 digits, conventionally written XXX-X-XXXXX-X
// (e.g. 123-4-56789-0). The DB stores digits only; this helper formats for display
// and input. Pattern follows what banking apps (Wise, Revolut, SCB/KBank) do:
// strip to digits, cap length, re-insert dashes progressively while typing.

const GROUP_SIZES = [3, 1, 5, 1] as const;
export const THAI_BANK_ACCOUNT_DIGITS = 10;
export const THAI_BANK_ACCOUNT_PLACEHOLDER = "123-4-56789-0";

/** Keep digits only, capped at 10 (legacy rows with more digits are truncated). */
export function normalizeThaiBankAccountDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(0, THAI_BANK_ACCOUNT_DIGITS);
}

/** Progressively format digits as XXX-X-XXXXX-X. Partial input stays readable. */
export function formatThaiBankAccount(value: string | null | undefined): string {
  const digits = normalizeThaiBankAccountDigits(value);
  if (!digits) return "";
  const groups: string[] = [];
  let i = 0;
  for (const size of GROUP_SIZES) {
    if (i >= digits.length) break;
    groups.push(digits.slice(i, i + size));
    i += size;
  }
  return groups.join("-");
}

/** True when the value holds a complete 10-digit account number. */
export function isCompleteThaiBankAccount(value: string | null | undefined): boolean {
  return normalizeThaiBankAccountDigits(value).length === THAI_BANK_ACCOUNT_DIGITS;
}
