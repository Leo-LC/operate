import { CANONICAL_SHOPS, OTHER_REVIEW, type NormalizedField } from "../types";

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^capybara coffee\s*/i, "")
    .replace(/\s+/g, " ");
}

const SHOP_ALIASES: Record<string, (typeof CANONICAL_SHOPS)[number]> = {
  phangan: "Phangan",
  "koh phangan": "Phangan",
  "ko phangan": "Phangan",
  "koh pha ngan": "Phangan",
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
};

export function normalizeShop(raw: string): NormalizedField {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { canonical: OTHER_REVIEW, matched: false, raw: trimmed };
  }

  const key = normalizeKey(trimmed);
  const direct = SHOP_ALIASES[key];
  if (direct) {
    return { canonical: direct, matched: true, raw: trimmed };
  }

  for (const shop of CANONICAL_SHOPS) {
    const shopKey = shop.toLowerCase();
    if (key === shopKey || key.includes(shopKey)) {
      return { canonical: shop, matched: true, raw: trimmed };
    }
  }

  return { canonical: OTHER_REVIEW, matched: false, raw: trimmed };
}

export function getCanonicalShops(): string[] {
  return [...CANONICAL_SHOPS];
}
