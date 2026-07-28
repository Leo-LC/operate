/** Canonical country display names + lookup helpers. */

export const KNOWN_COUNTRIES: readonly string[] = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Bosnia and Herzegovina",
  "Brazil", "Brunei", "Bulgaria", "Cambodia", "Canada", "Chile", "China", "Colombia",
  "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Czechia", "Denmark",
  "Dominican Republic", "Ecuador", "Egypt", "Estonia", "Ethiopia", "Finland", "France",
  "Georgia", "Germany", "Ghana", "Greece", "Guatemala", "Hong Kong", "Hungary", "Iceland",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kuwait", "Laos", "Latvia", "Lebanon", "Lithuania", "Luxembourg",
  "Macau", "Malaysia", "Maldives", "Malta", "Mexico", "Moldova", "Mongolia", "Morocco",
  "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Russian Federation", "Saudi Arabia", "Serbia",
  "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka",
  "Sweden", "Switzerland", "Taiwan", "Thailand", "Tunisia", "Turkey", "Türkiye", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Venezuela", "Vietnam",
];

const ALIASES: Record<string, string> = {
  th: "Thailand",
  thai: "Thailand",
  thailand: "Thailand",
  uk: "United Kingdom",
  gb: "United Kingdom",
  gbr: "United Kingdom",
  british: "United Kingdom",
  "united kingdom": "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  scotland: "United Kingdom",
  wales: "United Kingdom",
  usa: "United States",
  us: "United States",
  american: "United States",
  "united states": "United States",
  "united states of america": "United States",
  america: "United States",
  uae: "United Arab Emirates",
  emirati: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  fr: "France",
  french: "France",
  france: "France",
  de: "Germany",
  german: "Germany",
  germany: "Germany",
  deutschland: "Germany",
  au: "Australia",
  australian: "Australia",
  australia: "Australia",
  aus: "Australia",
  nz: "New Zealand",
  kiwi: "New Zealand",
  "new zealand": "New Zealand",
  ca: "Canada",
  canadian: "Canada",
  canada: "Canada",
  cn: "China",
  chinese: "China",
  china: "China",
  prc: "China",
  jp: "Japan",
  japanese: "Japan",
  japan: "Japan",
  kr: "South Korea",
  korean: "South Korea",
  "south korea": "South Korea",
  korea: "South Korea",
  sg: "Singapore",
  singaporean: "Singapore",
  singapore: "Singapore",
  my: "Malaysia",
  malaysian: "Malaysia",
  malaysia: "Malaysia",
  id: "Indonesia",
  indonesian: "Indonesia",
  indonesia: "Indonesia",
  vn: "Vietnam",
  vietnamese: "Vietnam",
  vietnam: "Vietnam",
  ph: "Philippines",
  filipino: "Philippines",
  philippines: "Philippines",
  in: "India",
  indian: "India",
  india: "India",
  ru: "Russia",
  russian: "Russia",
  russia: "Russia",
  nl: "Netherlands",
  dutch: "Netherlands",
  netherlands: "Netherlands",
  holland: "Netherlands",
  es: "Spain",
  spanish: "Spain",
  spain: "Spain",
  it: "Italy",
  italian: "Italy",
  italy: "Italy",
  ch: "Switzerland",
  swiss: "Switzerland",
  switzerland: "Switzerland",
  se: "Sweden",
  swedish: "Sweden",
  sweden: "Sweden",
  no: "Norway",
  norwegian: "Norway",
  norway: "Norway",
  dk: "Denmark",
  danish: "Denmark",
  denmark: "Denmark",
  fi: "Finland",
  finnish: "Finland",
  finland: "Finland",
  ie: "Ireland",
  irish: "Ireland",
  ireland: "Ireland",
  be: "Belgium",
  belgian: "Belgium",
  belgium: "Belgium",
  at: "Austria",
  austrian: "Austria",
  austria: "Austria",
  pl: "Poland",
  polish: "Poland",
  poland: "Poland",
  br: "Brazil",
  brazilian: "Brazil",
  brazil: "Brazil",
  mx: "Mexico",
  mexican: "Mexico",
  mexico: "Mexico",
  sa: "Saudi Arabia",
  saudi: "Saudi Arabia",
  "saudi arabia": "Saudi Arabia",
  il: "Israel",
  israeli: "Israel",
  israel: "Israel",
  za: "South Africa",
  "south africa": "South Africa",
  hk: "Hong Kong",
  "hong kong": "Hong Kong",
  tw: "Taiwan",
  taiwanese: "Taiwan",
  taiwan: "Taiwan",
  kh: "Cambodia",
  cambodia: "Cambodia",
  cambodian: "Cambodia",
  la: "Laos",
  laos: "Laos",
  mm: "Myanmar",
  myanmar: "Myanmar",
  burma: "Myanmar",
  tr: "Turkey",
  turkey: "Turkey",
  turkiye: "Turkey",
  pt: "Portugal",
  portugal: "Portugal",
  portuguese: "Portugal",
  gr: "Greece",
  greece: "Greece",
  greek: "Greece",
  cz: "Czech Republic",
  czechia: "Czech Republic",
  "czech republic": "Czech Republic",
  hu: "Hungary",
  hungary: "Hungary",
  ro: "Romania",
  romania: "Romania",
  ua: "Ukraine",
  ukraine: "Ukraine",
  eg: "Egypt",
  egypt: "Egypt",
  egyptian: "Egypt",
  ir: "Iran",
  iran: "Iran",
  pk: "Pakistan",
  pakistan: "Pakistan",
  bd: "Bangladesh",
  bangladesh: "Bangladesh",
  lk: "Sri Lanka",
  "sri lanka": "Sri Lanka",
  np: "Nepal",
  nepal: "Nepal",
  mo: "Macau",
  macau: "Macau",
  macao: "Macau",
};

/** Common free-text answers that are cities/regions, not countries. */
export const CITY_TO_COUNTRY: Record<string, string> = {
  bangkok: "Thailand",
  bkk: "Thailand",
  phuket: "Thailand",
  chiangmai: "Thailand",
  "chiang mai": "Thailand",
  chaingmai: "Thailand",
  chiangrai: "Thailand",
  "chiang rai": "Thailand",
  chaingrai: "Thailand",
  pattaya: "Thailand",
  samui: "Thailand",
  "koh samui": "Thailand",
  phangan: "Thailand",
  "koh phangan": "Thailand",
  krabi: "Thailand",
  "hua hin": "Thailand",
  london: "United Kingdom",
  manchester: "United Kingdom",
  edinburgh: "United Kingdom",
  paris: "France",
  lyon: "France",
  berlin: "Germany",
  munich: "Germany",
  hamburg: "Germany",
  amsterdam: "Netherlands",
  brussels: "Belgium",
  zurich: "Switzerland",
  geneva: "Switzerland",
  vienna: "Austria",
  rome: "Italy",
  milan: "Italy",
  barcelona: "Spain",
  madrid: "Spain",
  lisbon: "Portugal",
  stockholm: "Sweden",
  oslo: "Norway",
  copenhagen: "Denmark",
  helsinki: "Finland",
  dublin: "Ireland",
  sydney: "Australia",
  melbourne: "Australia",
  brisbane: "Australia",
  perth: "Australia",
  auckland: "New Zealand",
  wellington: "New Zealand",
  "new york": "United States",
  nyc: "United States",
  "los angeles": "United States",
  la: "United States",
  chicago: "United States",
  miami: "United States",
  austin: "United States",
  honolulu: "United States",
  california: "United States",
  texas: "United States",
  toronto: "Canada",
  vancouver: "Canada",
  montreal: "Canada",
  dubai: "United Arab Emirates",
  "abu dhabi": "United Arab Emirates",
  doha: "Qatar",
  riyadh: "Saudi Arabia",
  "tel aviv": "Israel",
  mumbai: "India",
  delhi: "India",
  bangalore: "India",
  jakarta: "Indonesia",
  bali: "Indonesia",
  "bali indonesia": "Indonesia",
  "kuala lumpur": "Malaysia",
  kl: "Malaysia",
  penang: "Malaysia",
  "hong kong": "Hong Kong",
  taipei: "Taiwan",
  seoul: "South Korea",
  busan: "South Korea",
  tokyo: "Japan",
  osaka: "Japan",
  kyoto: "Japan",
  beijing: "China",
  shanghai: "China",
  "hong kong sar": "Hong Kong",
  manila: "Philippines",
  cebu: "Philippines",
  hanoi: "Vietnam",
  "ho chi minh": "Vietnam",
  "ho chi minh city": "Vietnam",
  saigon: "Vietnam",
  "siem reap": "Cambodia",
  "phnom penh": "Cambodia",
};

const COUNTRY_LOOKUP = new Map<string, string>();

function registerCountry(canonical: string): void {
  COUNTRY_LOOKUP.set(canonical.toLowerCase(), canonical);
}

for (const country of KNOWN_COUNTRIES) {
  registerCountry(country);
}
for (const [alias, canonical] of Object.entries(ALIASES)) {
  COUNTRY_LOOKUP.set(alias, canonical);
}
for (const [city, country] of Object.entries(CITY_TO_COUNTRY)) {
  COUNTRY_LOOKUP.set(city, country);
}

/** Longest keys first for substring matching. */
export const COUNTRY_KEYS_BY_LENGTH = Array.from(COUNTRY_LOOKUP.keys()).sort(
  (a, b) => b.length - a.length,
);

import {
  isThailandPlace,
  isUsCity,
  isUsState,
  TRAILING_COUNTRY_HINTS,
} from "./regions-data";

export function lookupCountry(key: string): string | null {
  const direct = COUNTRY_LOOKUP.get(key);
  if (direct) return direct;

  if (isUsState(key) || isUsCity(key)) return "United States";
  if (isThailandPlace(key)) return "Thailand";

  // "Honolulu USA", "Austin, Texas" style — strip trailing country hint
  const tokens = key.split(/\s+/);
  if (tokens.length >= 2) {
    const last = tokens[tokens.length - 1];
    if (TRAILING_COUNTRY_HINTS.has(last)) {
      const place = tokens.slice(0, -1).join(" ");
      const hit = lookupCountry(place);
      if (hit) return hit;
    }
  }

  // "Austin Texas" — any token may be state/city
  for (const token of tokens) {
    if (isUsState(token) || isUsCity(token)) return "United States";
    if (isThailandPlace(token)) return "Thailand";
    const hit = COUNTRY_LOOKUP.get(token);
    if (hit) return hit;
  }

  // "City, Country" with comma in original — handled in country.ts via parts

  for (const candidate of COUNTRY_KEYS_BY_LENGTH) {
    if (candidate.length < 4) continue;
    if (key.includes(candidate)) {
      return COUNTRY_LOOKUP.get(candidate) ?? null;
    }
  }

  return null;
}
