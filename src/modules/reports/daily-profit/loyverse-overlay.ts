import { DAILY_PROFIT_METHODOLOGY } from "./methodology";
import type { SourceDailyEntry } from "./types";

export interface LoyverseSnapshotSale {
  locationId: string;
  date: string;
  revenue: number;
  vat: number;
  cashIn: number;
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parse une ligne de `loyverse_daily_snapshots` en vente.
 * Retourne null si la ligne n'est pas rattachée à une boutique ou sans date valide.
 */
export function toSnapshotSale(row: Record<string, unknown>): LoyverseSnapshotSale | null {
  const locationId = String(row.location_id ?? "");
  const date = String(row.date ?? "");
  if (!locationId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    locationId,
    date,
    revenue: DAILY_PROFIT_METHODOLOGY.revenueFields.reduce((sum, field) => sum + num(row[field]), 0),
    vat: num(row.vat_7),
    cashIn: num(row.payment_cash) + num(row.payment_scan) + num(row.payment_credit_card),
  };
}

/**
 * Loyverse = source de vérité des ventes : les snapshots écrasent
 * revenue/vat/cashIn (comme le write-back dans `daily_entries`), les
 * charges des saisies comptables sont préservées.
 *
 * Retourne les clés `locationId:date` couvertes par Loyverse seul
 * (aucune saisie comptable ce jour-là).
 */
export function applyLoyverseOverlay(
  entryMap: Map<string, SourceDailyEntry>,
  snapshots: LoyverseSnapshotSale[],
): Set<string> {
  const loyverseOnly = new Set<string>();
  for (const snap of snapshots) {
    const key = `${snap.locationId}:${snap.date}`;
    const existing = entryMap.get(key);
    if (existing) {
      existing.revenue = snap.revenue;
      existing.vat = snap.vat;
      existing.cashIn = snap.cashIn;
    } else {
      entryMap.set(key, {
        locationId: snap.locationId,
        date: snap.date,
        revenue: snap.revenue,
        vat: snap.vat,
        directExpenses: 0,
        hrCash: 0,
        cashIn: snap.cashIn,
      });
      loyverseOnly.add(key);
    }
  }
  return loyverseOnly;
}
