// Thai Baht denominations for the cash counter.
// `value` is in baht; counts are keyed by String(value).

export interface Denomination {
  value: number;
  label: string;
  kind: "note" | "coin";
}

export const THB_DENOMINATIONS: Denomination[] = [
  { value: 1000, label: "฿1,000", kind: "note" },
  { value: 500,  label: "฿500",   kind: "note" },
  { value: 100,  label: "฿100",   kind: "note" },
  { value: 50,   label: "฿50",    kind: "note" },
  { value: 20,   label: "฿20",    kind: "note" },
  { value: 10,   label: "฿10",    kind: "coin" },
  { value: 5,    label: "฿5",     kind: "coin" },
  { value: 2,    label: "฿2",     kind: "coin" },
  { value: 1,    label: "฿1",     kind: "coin" },
];

const KNOWN_VALUES = new Set(THB_DENOMINATIONS.map((d) => d.value));

export type DenomCounts = Record<string, number>;

/** Sum qty × value over known denominations; ignores unknown keys and bad qtys. */
export function computeCashTotal(counts: DenomCounts): number {
  let total = 0;
  for (const d of THB_DENOMINATIONS) {
    const qty = Math.floor(Number(counts[String(d.value)] ?? 0));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    total += qty * d.value;
  }
  // Round to 2dp to avoid float dust.
  return Math.round(total * 100) / 100;
}

/** True when every key is a known denomination with a non-negative integer qty. */
export function isValidCounts(counts: unknown): counts is DenomCounts {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) return false;
  return Object.entries(counts as Record<string, unknown>).every(
    ([k, v]) =>
      KNOWN_VALUES.has(Number(k)) &&
      typeof v === "number" &&
      Number.isInteger(v) &&
      v >= 0,
  );
}
