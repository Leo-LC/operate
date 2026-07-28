import { getOrganizationAccessToken } from "@/lib/google-token";
import { normalizeChannel } from "../normalize/channel";
import { normalizeCountry } from "../normalize/country";
import { normalizeShop } from "../normalize/shop";
import {
  DEFAULT_SHEET_ID,
  DEFAULT_SHEET_TAB,
  SHEET_COLUMNS,
  type FormResponseRow,
} from "../types";

const CACHE_TTL_MS = 60_000;

interface SheetCache {
  fetchedAt: number;
  rows: FormResponseRow[];
}

let sheetCache: SheetCache | null = null;

function getSheetId(): string {
  return (process.env.CUSTOMER_INSIGHTS_SHEET_ID ?? DEFAULT_SHEET_ID).trim();
}

function getSheetTab(): string {
  return (process.env.CUSTOMER_INSIGHTS_SHEET_TAB ?? DEFAULT_SHEET_TAB).trim();
}

function parseTimestamp(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const [, month, day, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dmy) {
    const [, day, month, yearRaw] = dmy;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function findColumnIndex(headers: string[], expected: string): number {
  const normalizedExpected = expected.trim().toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === normalizedExpected);
}

function parseSheetRows(values: string[][]): FormResponseRow[] {
  if (values.length < 2) return [];

  const headers = values[0].map((h) => h.trim());
  const tsIdx = findColumnIndex(headers, SHEET_COLUMNS.timestamp);
  const countryIdx = findColumnIndex(headers, SHEET_COLUMNS.country);
  const shopIdx = findColumnIndex(headers, SHEET_COLUMNS.shop);
  const channelIdx = findColumnIndex(headers, SHEET_COLUMNS.channel);

  if (tsIdx === -1 || countryIdx === -1 || shopIdx === -1 || channelIdx === -1) {
    throw new Error(
      `Missing required columns. Expected: ${Object.values(SHEET_COLUMNS).join(", ")}`,
    );
  }

  const rows: FormResponseRow[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const timestamp = (row[tsIdx] ?? "").trim();
    const countryRaw = (row[countryIdx] ?? "").trim();
    const shopRaw = (row[shopIdx] ?? "").trim();
    const channelRaw = (row[channelIdx] ?? "").trim();

    if (!timestamp && !countryRaw && !shopRaw && !channelRaw) continue;

    rows.push({
      timestamp,
      timestampDate: parseTimestamp(timestamp),
      countryRaw,
      shopRaw,
      channelRaw,
      shop: normalizeShop(shopRaw),
      channel: normalizeChannel(channelRaw),
      country: normalizeCountry(countryRaw),
    });
  }

  return rows;
}

export async function isCustomerInsightsConfigured(): Promise<boolean> {
  const token = await getOrganizationAccessToken();
  return token !== null;
}

export async function fetchFormResponses(forceRefresh = false): Promise<FormResponseRow[]> {
  const now = Date.now();
  if (!forceRefresh && sheetCache && now - sheetCache.fetchedAt < CACHE_TTL_MS) {
    return sheetCache.rows;
  }

  const token = await getOrganizationAccessToken();
  if (!token) {
    throw new Error(
      "Google account not linked. Sign in with Google and grant spreadsheet access, then try again.",
    );
  }

  const sheetId = getSheetId();
  const sheetTab = getSheetTab();
  const range = encodeURIComponent(`'${sheetTab}'!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });

  if (res.status === 403 || res.status === 401) {
    throw new Error(
      "Cannot access the spreadsheet. Make sure your Google account has access, then sign out and back in to grant the spreadsheets permission.",
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const rows = parseSheetRows(data.values ?? []);

  sheetCache = { fetchedAt: now, rows };
  return rows;
}

export function clearFormResponsesCache(): void {
  sheetCache = null;
}
