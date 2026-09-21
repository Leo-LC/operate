/**
 * Canonical shop registry — single source of truth for shop identity.
 *
 * The `locations` table (edited in Admin → Shops) owns the display name and
 * the external bindings (GBP `external_id`, `loyverse_store_id`,
 * `google_sheet_id`). This module owns the *stable vocabulary* shared by all
 * modules so that every "Laguna" resolves to Laguna and every "Ekkamai" to
 * Ekkamai, whatever the source spelling (GBP title, Loyverse store, Google
 * Form free text, accounting sheet, challenge key).
 *
 * Rules:
 * - `ShopCode` is the stable key (matches `locations.slug`).
 * - Free-text resolution is centralized here — do not add ad-hoc alias maps
 *   in feature modules; extend `FREE_TEXT_ALIASES` instead.
 * - Historical quirk: "Phuket" answers in Customer Insights meant Laguna
 *   (the only Phuket shop at the time). Those aliases are kept as legacy and
 *   resolve to `laguna`. The new Phuket shop is `karon` — always use the
 *   explicit name going forward, never the bare "Phuket".
 */

export const SHOP_CODES = [
  "phangan",
  "ekkamai",
  "samui",
  "silom",
  "pattaya",
  "chiang-mai",
  "laguna",
  "karon",
] as const;

export type ShopCode = (typeof SHOP_CODES)[number];

export const SHOP_CODE_TO_NAME: Record<ShopCode, string> = {
  phangan: "Phangan",
  ekkamai: "Ekkamai",
  samui: "Samui",
  silom: "Silom",
  pattaya: "Pattaya",
  "chiang-mai": "Chiang Mai",
  laguna: "Laguna",
  karon: "Karon",
};

const NAME_TO_CODE = new Map<string, ShopCode>(
  (Object.entries(SHOP_CODE_TO_NAME) as [ShopCode, string][]).map(([code, name]) => [name, code]),
);

/**
 * Free-text alias → canonical code. Keys are normalized (lowercase,
 * collapsed whitespace). Longest-match wins at resolve time via substring
 * scan, so only base forms are needed here.
 *
 * `legacy` marks spellings that predate an explicit shop (e.g. bare
 * "phuket" meant Laguna before Karon opened). They keep resolving for
 * historical rows but must not be offered as choices in UI.
 */
interface AliasEntry {
  code: ShopCode;
  legacy?: boolean;
}

const FREE_TEXT_ALIASES: Record<string, AliasEntry> = {
  phangan: { code: "phangan" },
  "koh phangan": { code: "phangan" },
  "ko phangan": { code: "phangan" },
  "koh pha ngan": { code: "phangan" },
  "koh pha-ngan": { code: "phangan" },
  ekkamai: { code: "ekkamai" },
  "bkk ekkamai": { code: "ekkamai" },
  "bangkok ekkamai": { code: "ekkamai" },
  samui: { code: "samui" },
  "koh samui": { code: "samui" },
  "ko samui": { code: "samui" },
  silom: { code: "silom" },
  "bangkok silom": { code: "silom" },
  "bkk silom": { code: "silom" },
  pattaya: { code: "pattaya" },
  "chiang mai": { code: "chiang-mai" },
  chiangmai: { code: "chiang-mai" },
  cm: { code: "chiang-mai" },
  laguna: { code: "laguna" },
  "phuket laguna": { code: "laguna" },
  "laguna phuket": { code: "laguna" },
  "phuket-laguna": { code: "laguna" },
  // Legacy: bare "Phuket" predates Karon and always meant Laguna.
  phuket: { code: "laguna", legacy: true },
  "phuket town": { code: "laguna", legacy: true },
  "phuket old town": { code: "laguna", legacy: true },
  karon: { code: "karon" },
  "karon beach": { code: "karon" },
  "karon phuket": { code: "karon" },
  "phuket karon": { code: "karon" },
};

function normalizeFreeText(raw: string): string {
  return raw.toLowerCase().replace(/[\s_]+/g, " ").trim();
}

function stripShopPrefixes(raw: string): string {
  return raw
    .replace(/^capybara\s+coffee\s*/i, "")
    .replace(/^capybara\s*/i, "")
    .replace(/^bc\s*/i, "")
    .replace(/^bangkok\s*[-–—]?\s*/i, "")
    .replace(/^bkk\s*[-–—]?\s*/i, "")
    .replace(/^shop\s*[-–—:]?\s*/i, "")
    .trim();
}

/** Canonical display name for a shop code. */
export function shopDisplayName(code: ShopCode): string {
  return SHOP_CODE_TO_NAME[code];
}

/** Shop code for a `locations.slug` (slugs are the DB-side stable key). */
export function shopCodeFromSlug(slug: string): ShopCode | null {
  const key = slug.toLowerCase().trim();
  return (SHOP_CODES as readonly string[]).includes(key) ? (key as ShopCode) : null;
}

/** Shop code for a canonical display name (`locations.name`). */
export function shopCodeFromName(name: string): ShopCode | null {
  return NAME_TO_CODE.get(name.trim()) ?? null;
}

/**
 * Resolve arbitrary free text (form answer, sheet label, GBP title…) to a
 * canonical shop code. Returns `null` when nothing matches — callers decide
 * how to surface unmatched values (log them, don't silently drop them).
 */
export function resolveShopCode(raw: string): ShopCode | null {
  const cleaned = stripShopPrefixes(raw.trim());
  if (!cleaned) return null;
  const key = normalizeFreeText(cleaned);
  const fullKey = normalizeFreeText(raw.trim());

  const direct = FREE_TEXT_ALIASES[key] ?? FREE_TEXT_ALIASES[fullKey];
  if (direct) return direct.code;

  // Longest canonical names first so "Chiang Mai" wins over partial matches.
  const byLength = [...SHOP_CODES].sort((a, b) => b.length - a.length);
  for (const code of byLength) {
    const nameKey = normalizeFreeText(SHOP_CODE_TO_NAME[code]);
    if (key === nameKey || fullKey === nameKey) return code;
    if (key.includes(nameKey) || fullKey.includes(nameKey)) return code;
  }
  if (/karon/.test(key) || /karon/.test(fullKey)) return "karon";
  if (/laguna/.test(key) || /laguna/.test(fullKey)) return "laguna";
  if (/phuket/.test(key) || /phuket/.test(fullKey)) return "laguna"; // legacy
  return null;
}

/** Display name for free text, or the cleaned raw label when unmatched. */
export function resolveShopName(raw: string): string | null {
  const code = resolveShopCode(raw);
  return code ? SHOP_CODE_TO_NAME[code] : null;
}
