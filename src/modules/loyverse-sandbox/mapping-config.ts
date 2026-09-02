import type { PaymentBucket, SalesBucket } from "./types";

/**
 * Map Loyverse category names (lowercase substring match) to accounting sales buckets.
 * Refine after probing GET /categories.
 */
export const CATEGORY_NAME_TO_BUCKET: Record<string, SalesBucket> = {
  drink: "drinks",
  coffee: "drinks",
  beverage: "drinks",
  ticket: "ticket",
  entry: "ticket",
  admission: "ticket",
  snack: "snack",
  food: "snack",
  goodies: "goodies",
  merch: "goodies",
  merchandise: "goodies",
  souvenir: "goodies",
};

/**
 * Map Loyverse category IDs (from GET /categories) to buckets.
 * Prefer this once you have stable IDs from the API Explorer.
 */
export const CATEGORY_ID_TO_BUCKET: Record<string, SalesBucket> = {
  // "category-uuid": "drinks",
};

/**
 * Map Loyverse payment type names/types to accounting payment buckets.
 */
export const PAYMENT_TYPE_KEYWORDS: Record<PaymentBucket, string[]> = {
  cash: ["cash"],
  scan: ["scan", "qr", "promptpay", "transfer"],
  credit_card: ["card", "credit", "visa", "mastercard", "worldpay"],
  other: [],
};

// Samui temporary POS fix — keep until POS is updated (see AGENTS / spec)
export const SAMUI_SNACK_ITEM_NORMALIZED = "a snacks";
export const SAMUI_ENTRY_ITEM_NORMALIZED = new Set<string>(["a entry adult", "a entry child"]);

export function normalizeItemName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function isSamuiSnackItem(itemName: string | null | undefined): boolean {
  return normalizeItemName(itemName) === SAMUI_SNACK_ITEM_NORMALIZED;
}

export function isSamuiEntryItem(itemName: string | null | undefined): boolean {
  return SAMUI_ENTRY_ITEM_NORMALIZED.has(normalizeItemName(itemName));
}

export function resolveSalesBucket(
  categoryId: string | null | undefined,
  categoryName: string | null | undefined,
  itemName: string | null | undefined,
): SalesBucket {
  if (categoryId && CATEGORY_ID_TO_BUCKET[categoryId]) {
    return CATEGORY_ID_TO_BUCKET[categoryId];
  }

  const haystack = `${categoryName ?? ""} ${itemName ?? ""}`.toLowerCase();
  // Card surcharge must be checked first — e.g. "Card Fee 3%" should not be bucketed as ticket/drinks
  if (haystack.includes("surcharge") || haystack.includes("card fee") || haystack.includes("cardfee") || haystack.includes("fee 3%")) {
    return "surcharge";
  }
  for (const [keyword, bucket] of Object.entries(CATEGORY_NAME_TO_BUCKET)) {
    if (haystack.includes(keyword)) return bucket;
  }
  return "other";
}

export function resolveSalesBucketForSamui(
  categoryId: string | null | undefined,
  categoryName: string | null | undefined,
  itemName: string | null | undefined,
): SalesBucket {
  const normalized = normalizeItemName(itemName);
  if (normalized === SAMUI_SNACK_ITEM_NORMALIZED) return "snack";
  if (SAMUI_ENTRY_ITEM_NORMALIZED.has(normalized)) return "ticket";
  const bucket = resolveSalesBucket(categoryId, categoryName, itemName);
  // For Samui, only the explicit items above count as snack/ticket; ignore category-based tickets/snacks
  if (bucket === "snack" || bucket === "ticket") return "other";
  return bucket;
}

export function resolvePaymentBucket(
  paymentType: string | null | undefined,
  paymentName: string | null | undefined,
): PaymentBucket {
  const haystack = `${paymentType ?? ""} ${paymentName ?? ""}`.toLowerCase();
  if (haystack.includes("cashrounding")) return "cash";
  for (const [bucket, keywords] of Object.entries(PAYMENT_TYPE_KEYWORDS) as [PaymentBucket, string[]][]) {
    if (bucket === "other") continue;
    if (keywords.some((kw) => haystack.includes(kw))) return bucket;
  }
  return "other";
}
