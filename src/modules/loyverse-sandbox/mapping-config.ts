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
  // Sept 2026 rename: "Snacks" → "Animal food" (category and/or item, per shop).
  // "food" below already covers "Animal food", these explicit variants cover
  // compact spellings (AnimalFood, animal-food, animal_food).
  "animal food": "snack",
  "animalfood": "snack",
  "animal-food": "snack",
  "animal_food": "snack",
  food: "snack",
  goodies: "goodies",
  merch: "goodies",
  merchandise: "goodies",
  souvenir: "goodies",
  capybara: "goodies",
  // Item-name fallback for merch sold without a Loyverse category (e.g. deleted
  // items resolve to category_id null). Checked after snack/ticket keywords, so
  // "AD CAPY SNACK" still resolves to snack. Short/generic words use a leading
  // space (" key" not "key") to avoid matching "monkey"/"turkey".
  capy: "goodies",
  keychain: "goodies",
  "key chain": "goodies",
  keyring: "goodies",
  " key": "goodies",
  tote: "goodies",
  bag: "goodies",
  magnet: "goodies",
  sticker: "goodies",
  postcard: "goodies",
  plush: "goodies",
  squishy: "goodies",
  tshirt: "goodies",
  "t-shirt": "goodies",
  tumbler: "goodies",
  mug: "goodies",
  "blind box": "goodies",
  "blind bag": "goodies",
  doll: "goodies",
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
// Snack item renamed "A Snacks" → "Animal food" (Sept 2026). Match by substring
// so legacy receipts ("A Snacks") and renamed ones ("Animal food",
// "A.ANIMAL FOOD 100") all resolve — item-name only, Samui categories are
// unreliable (the guard in resolveSalesBucketForSamui still discards
// category-based snack/ticket).
export const SAMUI_SNACK_ITEM_NORMALIZED = "a snacks";
export const SAMUI_ENTRY_ITEM_NORMALIZED = new Set<string>(["a entry adult", "a entry child"]);

export function normalizeItemName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function isSamuiSnackItem(itemName: string | null | undefined): boolean {
  const normalized = normalizeItemName(itemName);
  if (normalized === SAMUI_SNACK_ITEM_NORMALIZED) return true;
  if (normalized.includes("snack")) return true;
  // compact match: "animal food", "animal-food", "animal_food", "animalfood"
  return normalized.replace(/[^a-z0-9]/g, "").includes("animalfood");
}

export function isSamuiEntryItem(itemName: string | null | undefined): boolean {
  return SAMUI_ENTRY_ITEM_NORMALIZED.has(normalizeItemName(itemName));
}

/**
 * Adult entry detection for the drinks-rate lab (and future use).
 *
 * Ticket buckets mix adults + children ("Kid", "A.Kid", "AB CHILDREN",
 * "A ENTRY child"), and shops rename items freely ("Adult", "AA ADULT",
 * "A.Adult", "A ENTRY adult", "Adult 20%"). The invariant observed across
 * shops (Sept 2026) is that adult entries always contain "adult" in the
 * item name — so: entry-like item AND "adult" in the name.
 *
 * Guards:
 * - "A ENTRY adult" is exact-matched (Samui miscategorizes it under Drinks,
 *   so the ticket-bucket check alone would miss it).
 * - merch containing "adult" ("Tshirt Adult") is excluded via the merch-name
 *   guard + the ticket-bucket requirement.
 * - ticket-category items without "adult" ("Birthday party", all Kid/child
 *   variants) are NOT counted — negligible volume, ambiguous meaning.
 */
export function isAdultEntryItem(
  itemName: string | null | undefined,
  categoryId: string | null | undefined,
  categoryName: string | null | undefined,
): boolean {
  const normalized = normalizeItemName(itemName);
  if (!normalized.includes("adult")) return false;
  if (normalized === "a entry adult") return true;
  if (/tshirt|t-shirt|merch/.test(normalized)) return false;
  return resolveSalesBucket(categoryId, categoryName, itemName) === "ticket";
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
  // Card surcharge must be checked first — e.g. "Card Fee 3%" should not be bucketed as ticket/drinks.
  // "3% Card" (Samui files it under Drinks, others under Goodies/Fee) is the same fee, reversed wording.
  if (haystack.includes("surcharge") || haystack.includes("card fee") || haystack.includes("cardfee") || haystack.includes("fee 3%") || (haystack.includes("card") && haystack.includes("3%"))) {
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
  if (isSamuiSnackItem(itemName)) return "snack";
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
