import { CANONICAL_SHOPS, type NormalizedField } from "../types";
import { normalizeKey, rawLabel, stripNotes } from "./text";

type ShopName = (typeof CANONICAL_SHOPS)[number];

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

const SHOP_ALIASES: Record<string, ShopName> = {
  phangan: "Phangan",
  "koh phangan": "Phangan",
  "ko phangan": "Phangan",
  "koh pha ngan": "Phangan",
  "koh pha-ngan": "Phangan",
  ekkamai: "Ekkamai",
  "bkk ekkamai": "Ekkamai",
  "bangkok ekkamai": "Ekkamai",
  samui: "Samui",
  "koh samui": "Samui",
  "ko samui": "Samui",
  silom: "Silom",
  "bangkok silom": "Silom",
  "bkk silom": "Silom",
  pattaya: "Pattaya",
  "chiang mai": "Chiang Mai",
  chiangmai: "Chiang Mai",
  cm: "Chiang Mai",
  laguna: "Laguna",
  "phuket laguna": "Laguna",
  "laguna phuket": "Laguna",
  "phuket-laguna": "Laguna",
  phuket: "Phuket",
  "phuket town": "Phuket",
  "phuket old town": "Phuket",
};

/** Longest names first so "Chiang Mai" wins over partial matches. */
const SHOPS_BY_LENGTH = [...CANONICAL_SHOPS].sort((a, b) => b.length - a.length);

export function normalizeShop(raw: string): NormalizedField {
  const trimmed = stripNotes(raw);
  if (!trimmed) {
    return { canonical: rawLabel(raw), matched: false, raw: trimmed };
  }

  const stripped = stripShopPrefixes(trimmed);
  const key = normalizeKey(stripped);
  const fullKey = normalizeKey(trimmed);

  const direct = SHOP_ALIASES[key] ?? SHOP_ALIASES[fullKey];
  if (direct) {
    return { canonical: direct, matched: true, raw: trimmed };
  }

  for (const shop of SHOPS_BY_LENGTH) {
    const shopKey = normalizeKey(shop);
    if (key === shopKey || fullKey === shopKey) {
      return { canonical: shop, matched: true, raw: trimmed };
    }
    if (key.includes(shopKey) || fullKey.includes(shopKey)) {
      return { canonical: shop, matched: true, raw: trimmed };
    }
  }

  // "Phuket" in longer strings — prefer Laguna only when laguna is mentioned
  if (/laguna/.test(key) || /laguna/.test(fullKey)) {
    return { canonical: "Laguna", matched: true, raw: trimmed };
  }
  if (/phuket/.test(key) || /phuket/.test(fullKey)) {
    return { canonical: "Phuket", matched: true, raw: trimmed };
  }

  return { canonical: rawLabel(trimmed), matched: false, raw: trimmed };
}

export function getCanonicalShops(): string[] {
  return [...CANONICAL_SHOPS];
}
