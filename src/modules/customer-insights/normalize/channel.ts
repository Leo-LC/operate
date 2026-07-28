import { OTHER_REVIEW, type NormalizedField } from "../types";
import { normalizeKey, rawLabel, stripNotes } from "./text";

const CANONICAL_CHANNELS = [
  "Instagram",
  "Google",
  "TikTok",
  "Facebook",
  "Friend / Word of mouth",
  "Hotel / Accommodation",
  "Walk-in",
  "TripAdvisor / Maps",
  "YouTube",
  "Blog / Article",
  OTHER_REVIEW,
] as const;

type CanonicalChannel = (typeof CANONICAL_CHANNELS)[number];

const CHANNEL_ALIASES: Record<string, CanonicalChannel> = {
  instagram: "Instagram",
  insta: "Instagram",
  ig: "Instagram",
  google: "Google",
  "google maps": "Google",
  "google search": "Google",
  gmaps: "Google",
  maps: "Google",
  tiktok: "TikTok",
  "tik tok": "TikTok",
  facebook: "Facebook",
  fb: "Facebook",
  meta: "Facebook",
  friend: "Friend / Word of mouth",
  friends: "Friend / Word of mouth",
  "word of mouth": "Friend / Word of mouth",
  "friend / word of mouth": "Friend / Word of mouth",
  recommendation: "Friend / Word of mouth",
  recommended: "Friend / Word of mouth",
  referral: "Friend / Word of mouth",
  hotel: "Hotel / Accommodation",
  accommodation: "Hotel / Accommodation",
  "hotel / accommodation": "Hotel / Accommodation",
  hostel: "Hotel / Accommodation",
  airbnb: "Hotel / Accommodation",
  booking: "Hotel / Accommodation",
  "booking.com": "Hotel / Accommodation",
  agoda: "Hotel / Accommodation",
  resort: "Hotel / Accommodation",
  "walk in": "Walk-in",
  "walk-in": "Walk-in",
  walkin: "Walk-in",
  passing: "Walk-in",
  "passed by": "Walk-in",
  tripadvisor: "TripAdvisor / Maps",
  "trip advisor": "TripAdvisor / Maps",
  youtube: "YouTube",
  yt: "YouTube",
  blog: "Blog / Article",
  article: "Blog / Article",
  magazine: "Blog / Article",
  press: "Blog / Article",
};

const CHANNEL_CONTAINS: { pattern: RegExp; canonical: CanonicalChannel }[] = [
  { pattern: /insta|instagram|\big\b/i, canonical: "Instagram" },
  { pattern: /google|gmaps|\bmaps\b/i, canonical: "Google" },
  { pattern: /tik\s?tok/i, canonical: "TikTok" },
  { pattern: /facebook|\bfb\b|\bmeta\b/i, canonical: "Facebook" },
  { pattern: /friend|recommend|word of mouth|referr|family|colleague|partner/i, canonical: "Friend / Word of mouth" },
  { pattern: /hotel|hostel|accommodation|airbnb|resort|booking\.?com|agoda/i, canonical: "Hotel / Accommodation" },
  { pattern: /walk[- ]?in|pass(?:ed|ing) by|saw (?:the )?sign|street/i, canonical: "Walk-in" },
  { pattern: /trip\s?advisor/i, canonical: "TripAdvisor / Maps" },
  { pattern: /youtube|\byt\b/i, canonical: "YouTube" },
  { pattern: /blog|article|magazine|press|review site/i, canonical: "Blog / Article" },
];

export function normalizeChannel(raw: string): NormalizedField {
  const trimmed = stripNotes(raw);
  if (!trimmed) {
    return { canonical: OTHER_REVIEW, matched: false, raw: trimmed };
  }

  const key = normalizeKey(trimmed);
  const direct = CHANNEL_ALIASES[key];
  if (direct) {
    return { canonical: direct, matched: true, raw: trimmed };
  }

  for (const { pattern, canonical } of CHANNEL_CONTAINS) {
    if (pattern.test(trimmed)) {
      return { canonical, matched: true, raw: trimmed };
    }
  }

  return { canonical: rawLabel(trimmed), matched: false, raw: trimmed };
}

export function getCanonicalChannels(): string[] {
  return CANONICAL_CHANNELS.filter((c) => c !== OTHER_REVIEW);
}
