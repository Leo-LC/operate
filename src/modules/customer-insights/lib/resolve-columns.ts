import { SHEET_COLUMNS } from "../types";

export interface ResolvedColumns {
  headerRowIndex: number;
  timestamp: number;
  country: number;
  shop: number;
  channel: number;
}

type ColumnKey = keyof typeof SHEET_COLUMNS;

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.,;:'"()[\]]/g, "");
}

function isSkippedColumn(normalizedHeader: string): boolean {
  return (
    normalizedHeader === "" ||
    /\bemail\b/.test(normalizedHeader) ||
    /\bscore\b/.test(normalizedHeader) ||
    normalizedHeader === "name" ||
    normalizedHeader === "username"
  );
}

const COLUMN_PATTERNS: Record<ColumnKey, RegExp[]> = {
  timestamp: [/^timestamp$/, /\btimestamp\b/, /^time$/, /\bdate submitted\b/],
  country: [
    /^where are you from$/,
    /\bwhere are you from\b/,
    /\bwhere.*from\b/,
    /\bcountry\b/,
    /\bnationality\b/,
    /\bcome from\b/,
    /\borigin\b/,
  ],
  shop: [
    /^which shop did you visit today$/,
    /\bwhich shop\b/,
    /\bshop.*visit\b/,
    /\bvisit.*shop\b/,
    /\bshop you visited\b/,
    /\bwhich store\b/,
    /\bstore.*visit\b/,
    /\blocation.*visit\b/,
    /\bbranch\b/,
  ],
  channel: [
    /^how did you hear about us$/,
    /\bhow did you hear\b/,
    /\bhear about us\b/,
    /\bhear about\b/,
    /\bhow did you find\b/,
    /\bhow did you discover\b/,
    /\bhow did you know\b/,
    /\breferral\b/,
    /\bfind us\b/,
  ],
};

function matchesColumn(normalizedHeader: string, key: ColumnKey): boolean {
  const expected = normalizeHeader(SHEET_COLUMNS[key]);
  if (normalizedHeader === expected) return true;
  return COLUMN_PATTERNS[key].some((pattern) => pattern.test(normalizedHeader));
}

function resolveColumnsByName(headers: string[]): Omit<ResolvedColumns, "headerRowIndex"> | null {
  const normalized = headers.map(normalizeHeader);
  const indices: Partial<Record<ColumnKey, number>> = {};

  for (let i = 0; i < normalized.length; i++) {
    const header = normalized[i];
    if (!header || isSkippedColumn(header)) continue;

    for (const key of Object.keys(SHEET_COLUMNS) as ColumnKey[]) {
      if (indices[key] !== undefined) continue;
      if (matchesColumn(header, key)) {
        indices[key] = i;
      }
    }
  }

  if (
    indices.timestamp === undefined ||
    indices.country === undefined ||
    indices.shop === undefined ||
    indices.channel === undefined
  ) {
    return null;
  }

  return {
    timestamp: indices.timestamp,
    country: indices.country,
    shop: indices.shop,
    channel: indices.channel,
  };
}

/** Google Forms always puts Timestamp in column A; questions follow (Email may be col B). */
function resolveColumnsByPosition(headers: string[]): Omit<ResolvedColumns, "headerRowIndex"> | null {
  const normalized = headers.map(normalizeHeader);
  let timestamp = normalized.findIndex((h) => matchesColumn(h, "timestamp"));
  if (timestamp === -1 && headers.length >= 4) {
    timestamp = 0;
  }
  if (timestamp === -1) return null;

  const questionCols = normalized
    .map((header, index) => ({ header, index }))
    .filter(({ header, index }) => index !== timestamp && !isSkippedColumn(header));

  if (questionCols.length < 3) return null;

  return {
    timestamp,
    country: questionCols[0].index,
    shop: questionCols[1].index,
    channel: questionCols[2].index,
  };
}

function resolveColumnsInRow(headers: string[]): Omit<ResolvedColumns, "headerRowIndex"> | null {
  return resolveColumnsByName(headers) ?? resolveColumnsByPosition(headers);
}

export function resolveSheetColumns(values: string[][]): ResolvedColumns {
  if (values.length === 0) {
    throw new Error("Spreadsheet tab is empty.");
  }

  const scanLimit = Math.min(values.length, 5);
  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex++) {
    const headers = (values[rowIndex] ?? []).map((h) => String(h ?? "").trim());
    const resolved = resolveColumnsInRow(headers);
    if (resolved) {
      return { headerRowIndex: rowIndex, ...resolved };
    }
  }

  const foundHeaders = (values[0] ?? [])
    .map((h) => String(h ?? "").trim())
    .filter(Boolean);

  throw new Error(
    `Missing required columns. Expected: ${Object.values(SHEET_COLUMNS).join(", ")}. ` +
      `Found headers: ${foundHeaders.length > 0 ? foundHeaders.join(" | ") : "(none)"}. ` +
      `Check CUSTOMER_INSIGHTS_SHEET_TAB matches your form responses tab.`,
  );
}
