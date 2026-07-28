export const OTHER_REVIEW = "Other / Review";

export interface NormalizedField {
  canonical: string;
  matched: boolean;
  raw: string;
}

export interface FormResponseRow {
  timestamp: string;
  timestampDate: string | null;
  countryRaw: string;
  shopRaw: string;
  channelRaw: string;
  shop: NormalizedField;
  channel: NormalizedField;
  country: NormalizedField;
}

export interface CountBucket {
  label: string;
  count: number;
}

export interface UnmatchedBucket {
  raw: string;
  count: number;
}

export interface CustomerInsightsSummary {
  totalSubmissions: number;
  byShop: CountBucket[];
  byChannel: CountBucket[];
  topCountries: CountBucket[];
  byWeek: { weekStart: string; count: number }[];
  unmatched: {
    shops: UnmatchedBucket[];
    channels: UnmatchedBucket[];
    countries: UnmatchedBucket[];
  };
  meta: {
    configured: boolean;
    dateRange: { min: string | null; max: string | null };
    shops: string[];
    lastFetchedAt: string;
    filtered: { from: string | null; to: string | null; shop: string };
    error?: string;
  };
}

export const SHEET_COLUMNS = {
  timestamp: "Timestamp",
  country: "Where are you from?",
  shop: "Which shop did you visit today?",
  channel: "How did you hear about us?",
} as const;

export const DEFAULT_SHEET_ID = "1658APEbKlP2zdpO3z0mH_T49RXCwIlOUGTDm6cLlUPA";
export const DEFAULT_SHEET_TAB = "Form Responses 1";

export const CANONICAL_SHOPS = [
  "Phangan",
  "Ekkamai",
  "Samui",
  "Silom",
  "Pattaya",
  "Chiang Mai",
  "Laguna",
] as const;
