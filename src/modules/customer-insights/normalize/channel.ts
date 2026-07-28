import { OTHER_REVIEW, type NormalizedField } from "../types";
import { normalizeKey, stripNotes } from "./text";

/** Exact labels from the Google Form multiple-choice question. */
export const FORM_CHANNEL_CHOICES = [
  "Instagram",
  "Facebook",
  "Tiktok",
  "Google",
  "Website",
  "Chat GPT (or any AI)",
  "Walking by",
  "Friend's recommendation",
  "Hotel / Concierge recommendation",
] as const;

export type FormChannelChoice = (typeof FORM_CHANNEL_CHOICES)[number];

const CHANNEL_ALIASES: Record<string, FormChannelChoice> = {
  instagram: "Instagram",
  insta: "Instagram",
  ig: "Instagram",
  facebook: "Facebook",
  fb: "Facebook",
  meta: "Facebook",
  tiktok: "Tiktok",
  "tik tok": "Tiktok",
  tiktokk: "Tiktok",
  google: "Google",
  "google maps": "Google",
  "google search": "Google",
  gmaps: "Google",
  maps: "Google",
  website: "Website",
  "web site": "Website",
  site: "Website",
  "capybara website": "Website",
  "chat gpt or any ai": "Chat GPT (or any AI)",
  "chat gpt (or any ai)": "Chat GPT (or any AI)",
  chatgpt: "Chat GPT (or any AI)",
  "chat gpt": "Chat GPT (or any AI)",
  gpt: "Chat GPT (or any AI)",
  ai: "Chat GPT (or any AI)",
  openai: "Chat GPT (or any AI)",
  "walking by": "Walking by",
  "walk by": "Walking by",
  "walking past": "Walking by",
  "walked by": "Walking by",
  "walk in": "Walking by",
  "walk-in": "Walking by",
  walkin: "Walking by",
  passing: "Walking by",
  "passed by": "Walking by",
  "friends recommendation": "Friend's recommendation",
  "friend's recommendation": "Friend's recommendation",
  "friend recommendation": "Friend's recommendation",
  friend: "Friend's recommendation",
  friends: "Friend's recommendation",
  "word of mouth": "Friend's recommendation",
  recommendation: "Friend's recommendation",
  recommended: "Friend's recommendation",
  referral: "Friend's recommendation",
  "hotel concierge recommendation": "Hotel / Concierge recommendation",
  "hotel / concierge recommendation": "Hotel / Concierge recommendation",
  hotel: "Hotel / Concierge recommendation",
  concierge: "Hotel / Concierge recommendation",
  "hotel recommendation": "Hotel / Concierge recommendation",
  accommodation: "Hotel / Concierge recommendation",
  hostel: "Hotel / Concierge recommendation",
  resort: "Hotel / Concierge recommendation",
};

const CHANNEL_CONTAINS: { pattern: RegExp; canonical: FormChannelChoice }[] = [
  { pattern: /insta|instagram|\big\b/i, canonical: "Instagram" },
  { pattern: /facebook|\bfb\b|\bmeta\b/i, canonical: "Facebook" },
  { pattern: /tik\s?tok/i, canonical: "Tiktok" },
  { pattern: /google|gmaps|\bmaps\b/i, canonical: "Google" },
  { pattern: /\bwebsite\b|\bweb\s*site\b|capybara\.(com|coffee)/i, canonical: "Website" },
  { pattern: /chat\s?gpt|\bgpt\b|\bai\b|openai|claude|gemini/i, canonical: "Chat GPT (or any AI)" },
  { pattern: /walk(?:ing|ed)?\s*(?:by|past|in)|pass(?:ed|ing)\s*by/i, canonical: "Walking by" },
  { pattern: /friend|recommend|word of mouth|referr|family told/i, canonical: "Friend's recommendation" },
  { pattern: /hotel|concierge|hostel|resort|reception/i, canonical: "Hotel / Concierge recommendation" },
];

export function normalizeChannel(raw: string): NormalizedField {
  const trimmed = stripNotes(raw);
  if (!trimmed) {
    return { canonical: OTHER_REVIEW, matched: false, raw: trimmed };
  }

  const key = normalizeKey(trimmed);

  // Exact form option (case-insensitive)
  for (const choice of FORM_CHANNEL_CHOICES) {
    if (normalizeKey(choice) === key) {
      return { canonical: choice, matched: true, raw: trimmed };
    }
  }

  const direct = CHANNEL_ALIASES[key];
  if (direct) {
    return { canonical: direct, matched: true, raw: trimmed };
  }

  for (const { pattern, canonical } of CHANNEL_CONTAINS) {
    if (pattern.test(trimmed)) {
      return { canonical, matched: true, raw: trimmed };
    }
  }

  return { canonical: OTHER_REVIEW, matched: false, raw: trimmed };
}

export function getFormChannelChoices(): FormChannelChoice[] {
  return [...FORM_CHANNEL_CHOICES];
}

/** Chart buckets: form choices only, sorted by count descending. */
export function buildChannelChartBuckets(
  channelMap: Map<string, number>,
  minCount = 1,
): { label: string; count: number }[] {
  return FORM_CHANNEL_CHOICES.map((label) => ({
    label,
    count: channelMap.get(label) ?? 0,
  }))
    .filter((b) => b.count >= minCount)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
