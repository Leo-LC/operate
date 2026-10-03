import type { CashSafeRow, FinanceLocation } from "./types";

export interface CashSafeSourceRow {
  location_id: string;
  entry_date: string;
  cash_safe: number | string | null;
}

export function buildCashSafeRows(
  locations: FinanceLocation[],
  rows: Array<CashSafeSourceRow | null>,
  requestedDate: string,
): CashSafeRow[] {
  const latestByLocation = new Map<string, CashSafeSourceRow>();

  for (const row of rows) {
    if (!row || row.entry_date > requestedDate) continue;
    const current = latestByLocation.get(row.location_id);
    if (!current || row.entry_date > current.entry_date) latestByLocation.set(row.location_id, row);
  }

  return locations.map((location) => {
    const row = latestByLocation.get(location.id);
    const rawAmount = row?.cash_safe;
    const amount = rawAmount === null || rawAmount === undefined || rawAmount === ""
      ? null
      : Number(rawAmount);

    return {
      locationId: location.id,
      locationName: location.name,
      amount: amount !== null && Number.isFinite(amount) ? amount : null,
      asOf: row?.entry_date ?? null,
      isStale: !row || row.entry_date < requestedDate,
    };
  });
}
