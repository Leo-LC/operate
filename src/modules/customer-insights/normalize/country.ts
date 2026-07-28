import { OTHER_REVIEW, type NormalizedField } from "../types";

const COUNTRY_ALIASES: Record<string, string> = {
  th: "Thailand",
  thailand: "Thailand",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  usa: "United States",
  us: "United States",
  "united states": "United States",
  "united states of america": "United States",
  america: "United States",
  fr: "France",
  france: "France",
  de: "Germany",
  germany: "Germany",
  deutschland: "Germany",
  au: "Australia",
  australia: "Australia",
  nz: "New Zealand",
  "new zealand": "New Zealand",
  ca: "Canada",
  canada: "Canada",
  cn: "China",
  china: "China",
  jp: "Japan",
  japan: "Japan",
  kr: "South Korea",
  "south korea": "South Korea",
  korea: "South Korea",
  sg: "Singapore",
  singapore: "Singapore",
  my: "Malaysia",
  malaysia: "Malaysia",
  id: "Indonesia",
  indonesia: "Indonesia",
  vn: "Vietnam",
  vietnam: "Vietnam",
  ph: "Philippines",
  philippines: "Philippines",
  in: "India",
  india: "India",
  ru: "Russia",
  russia: "Russian Federation",
  nl: "Netherlands",
  netherlands: "Netherlands",
  holland: "Netherlands",
  es: "Spain",
  spain: "Spain",
  it: "Italy",
  italy: "Italy",
  ch: "Switzerland",
  switzerland: "Switzerland",
  se: "Sweden",
  sweden: "Sweden",
  no: "Norway",
  norway: "Norway",
  dk: "Denmark",
  denmark: "Denmark",
  fi: "Finland",
  finland: "Finland",
  ie: "Ireland",
  ireland: "Ireland",
  be: "Belgium",
  belgium: "Belgium",
  at: "Austria",
  austria: "Austria",
  pl: "Poland",
  poland: "Poland",
  br: "Brazil",
  brazil: "Brazil",
  mx: "Mexico",
  mexico: "Mexico",
  ae: "United Arab Emirates",
  uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  sa: "Saudi Arabia",
  "saudi arabia": "Saudi Arabia",
  il: "Israel",
  israel: "Israel",
  za: "South Africa",
  "south africa": "South Africa",
  hk: "Hong Kong",
  "hong kong": "Hong Kong",
  tw: "Taiwan",
  taiwan: "Taiwan",
};

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeCountry(raw: string): NormalizedField {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { canonical: OTHER_REVIEW, matched: false, raw: trimmed };
  }

  const key = normalizeKey(trimmed);
  const direct = COUNTRY_ALIASES[key];
  if (direct) {
    return { canonical: direct, matched: true, raw: trimmed };
  }

  if (/^[a-z]{2,3}$/.test(key)) {
    const fromCode = COUNTRY_ALIASES[key];
    if (fromCode) {
      return { canonical: fromCode, matched: true, raw: trimmed };
    }
  }

  return { canonical: OTHER_REVIEW, matched: false, raw: trimmed };
}
