"use client";

import { useCallback, useEffect, useState } from "react";
import { InfoIcon } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { DateRangePicker } from "@/modules/reports/components/DateRangePicker";
import { useDirectionPeriod, useDirectionShops } from "@/modules/direction/lib/useDirectionPeriod";

// ── Helpers ──────────────────────────────────────────────────────────────
function fmtN(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtMoney(n: number) {
  return `฿${fmtN(Math.abs(n))}`;
}
function bangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const o: Record<string, string> = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${o.year}-${o.month}-${o.day}`;
}

// ── Types mirroring /api/reports/accounting ───────────────────────────
interface ShopAgg {
  locationId: string;
  locationName: string;
  revenue: number;
  expenses: number;
  hrCosts: number;
  netProfit: number;
  margin: number;
  drinks: number;
  tickets: number;
  snacks: number;
  goodies: number;
  surcharge: number;
  cash: number;
  scan: number;
  creditCard: number;
  expStaffFoodCash: number;
  expDrinksCash: number;
  expGoodiesCash: number;
  expAnimalsCash: number;
  expSupplyCash: number;
  expOtherCash: number;
  expMakroBank: number;
  expOtherBank: number;
  hrSalaryCash: number;
  hrServiceChargeCash: number;
  hrChallengeCash: number;
  vat: number;
  cashToBoss: number;
  closingCashSafe: number;
}
interface AccountingData {
  period: { from: string; to: string };
  locations: { id: string; name: string }[];
  overview: ShopAgg;
  byShop: ShopAgg[];
  previousPeriod: { period: { from: string; to: string }; overview: ShopAgg; byShop?: ShopAgg[] };
  dailyTotals: { date: string; revenue: number }[];
  monthlyExpenses: { categories: { key: string; label: string }[]; totals: Record<string, number>; entered: boolean };
  completeness: { totalExpected: number; totalFilled: number; percent: number; shopsIncomplete: string[] };
}

function MoneyBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-2)]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Main Overview ─────────────────────────────────────────────────────
export function DirectionOverview() {
  const { from, to, setRange } = useDirectionPeriod();
  const { selectedShops, setSelectedShops } = useDirectionShops();
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMoneyOutBreakdown, setShowMoneyOutBreakdown] = useState(false);
  const [shopSort, setShopSort] = useState<"resultat" | "sales" | "expenses">("resultat");

  const fetchData = useCallback(
    async (f: string, t: string, shops: string[], locs: { id: string; name: string }[]) => {
      setLoading(true);
      try {
        const locParam = locs.length > 0 && shops.length !== locs.length && shops.length > 0 ? shops.join(",") : "all";
        const res = await fetch(`/api/reports/accounting?from=${f}&to=${t}&locations=${locParam}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as AccountingData;
        setData(json);
        if (locs.length === 0 && json.locations.length > 0 && shops.length === 0) {
          setSelectedShops(json.locations.map((l) => l.id));
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (locations.length > 0) {
      void fetchData(from, to, selectedShops, locations);
    } else {
      void (async () => {
        setLoading(true);
        const res = await fetch(`/api/reports/accounting?from=${from}&to=${to}&locations=all`, { cache: "no-store" });
        const json = (await res.json()) as AccountingData;
        setData(json);
        setLocations(json.locations);
        setSelectedShops(json.locations.map((l) => l.id));
        setLoading(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    if (locations.length === 0) return;
    void fetchData(from, to, selectedShops, locations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShops.join(",")]);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--line-2)]" />
        ))}
      </div>
    );
  }
  if (!data) return <div className="py-10 text-center text-sm text-[var(--fg-4)]">Pas de données</div>;

  const o = data.overview;

  // ── Formules existantes — ne pas réinventer
  // revenue = somme ventes net (drinks+ticket+snack+goodies+surcharge) -> o.revenue
  // expenses = expTotal (opérationnel hors RH) -> o.expenses
  // hrCosts = hrTotal -> o.hrCosts
  // netProfit = revenue - expenses - hrCosts -> o.netProfit (Résultat)
  // vat -> o.vat
  const chargesFixes = o.expenses;
  const chargesRH = o.hrCosts;
  const resultat = o.netProfit;
  const bossExpenses = o.expenses + o.hrCosts;

  // Money in
  const moneyInRows = [
    { label: "Tickets", value: o.tickets, color: "var(--info)" },
    { label: "Drinks", value: o.drinks, color: "var(--bronze)" },
    { label: "Snacks", value: o.snacks, color: "var(--good)" },
    { label: "Goods", value: o.goodies, color: "var(--warn)" },
    { label: "Other", value: o.surcharge, color: "var(--fg-4)" },
  ]
    .filter((r) => r.value !== 0)
    .sort((a, b) => b.value - a.value);
  const moneyInMax = Math.max(...moneyInRows.map((r) => r.value), 1);

  // Money out — keep existing grouping
  const operating = o.expStaffFoodCash + o.expDrinksCash + o.expGoodiesCash + o.expAnimalsCash + o.expSupplyCash + o.expOtherCash + o.expMakroBank + o.expOtherBank;
  const salaries = o.hrSalaryCash;
  const serviceBonus = o.hrServiceChargeCash + o.hrChallengeCash;
  const fixedTotal = Object.values(data.monthlyExpenses.totals).reduce((s, v) => s + (v as number), 0);
  const moneyOutRows = [
    { label: "Salaries", value: salaries, color: "var(--purple)" },
    { label: "Operations", value: operating, color: "var(--warn)" },
    { label: "Fixed costs", value: fixedTotal, color: "var(--fg-3)" },
    { label: "Service / Bonus", value: serviceBonus, color: "var(--info)" },
  ]
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const moneyOutMax = Math.max(...moneyOutRows.map((r) => r.value), 1);

  const detailedOutRows = [
    { label: "Staff food", value: o.expStaffFoodCash },
    { label: "Drinks cash", value: o.expDrinksCash },
    { label: "Goodies cash", value: o.expGoodiesCash },
    { label: "Animals", value: o.expAnimalsCash },
    { label: "Supply", value: o.expSupplyCash },
    { label: "Other cash", value: o.expOtherCash },
    { label: "Makro bank", value: o.expMakroBank },
    { label: "Other bank", value: o.expOtherBank },
  ].filter((r) => r.value > 0);

  // Shops
  const shopsAll = data.byShop.map((s) => {
    const sExp = s.expenses + s.hrCosts;
    const sProfit = s.netProfit; // revenue - expenses - hrCosts (formule existante)
    return { ...s, _exp: sExp, _profit: sProfit };
  });
  const shops =
    selectedShops.length === 0 || selectedShops.length === locations.length
      ? shopsAll
      : shopsAll.filter((s) => selectedShops.includes(s.locationId));
  const sortedShops = [...shops].sort((a, b) => {
    if (shopSort === "resultat") return b._profit - a._profit;
    if (shopSort === "sales") return b.revenue - a.revenue;
    return b._exp - a._exp;
  });
  // For bar max, use relevant metric
  const shopMax =
    shopSort === "resultat"
      ? Math.max(...sortedShops.map((s) => Math.abs(s._profit)), 1)
      : shopSort === "sales"
        ? Math.max(...sortedShops.map((s) => s.revenue), 1)
        : Math.max(...sortedShops.map((s) => s._exp), 1);

  return (
    <div className="flex flex-col gap-5">
      {/* Période + Boutiques */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={{ from, to }} onChange={({ from: f, to: t }) => setRange(f, t)} today={bangkokToday()} />
          <button
            onClick={() => void fetchData(from, to, selectedShops, locations)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--bg-2)]"
          >
            ↻ Actualiser
          </button>
        </div>
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <PillButton active={selectedShops.length === locations.length} onClick={() => setSelectedShops(locations.map((l) => l.id))}>
              Toutes les boutiques
            </PillButton>
            {locations.map((loc) => (
              <PillButton
                key={loc.id}
                active={selectedShops.includes(loc.id)}
                onClick={() => {
                  if (selectedShops.length === locations.length) {
                    setSelectedShops([loc.id]);
                    return;
                  }
                  setSelectedShops((prev) => (prev.includes(loc.id) ? prev.filter((s) => s !== loc.id) : [...prev, loc.id]));
                }}
              >
                {shortShopName(loc.name)}
              </PillButton>
            ))}
          </div>
        )}
      </div>

      {/* Hiérarchie subtile */}
      <p className="text-xs text-[var(--fg-4)] hidden lg:block" style={{ margin: "-4px 0 0" }}>
        Chiffre d’affaires <span style={{ color: "var(--fg-3)" }}> − </span> Charges fixes / opérationnelles <span style={{ color: "var(--fg-3)" }}> − </span> Charges RH <span style={{ color: "var(--fg-3)" }}> = </span> <strong style={{ color: "var(--fg)" }}>Résultat</strong>
        <span style={{ color: "var(--fg-4)", marginLeft: 12 }}>·</span> <span style={{ marginLeft: 12 }}>TVA encaissée informative</span>
      </p>

      {/* KPI — exactement 5, sans variations */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Chiffre d'affaires" value={`฿${fmtN(o.revenue)}`} />
        <KpiCard label="Charges fixes / opérationnelles" value={`฿${fmtN(chargesFixes)}`} />
        <KpiCard label="Charges RH" value={`฿${fmtN(chargesRH)}`} />
        <KpiCard
          label="Résultat"
          value={`฿${fmtN(resultat)}`}
          accent
          tooltip="Chiffre d’affaires moins charges opérationnelles et RH enregistrées. TVA à reverser et impôt sur les sociétés non inclus."
        />
        <KpiCard label="TVA encaissée" value={`฿${fmtN(o.vat)}`} />
      </div>

      {/* Money in / Money out — inchangé */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--fg-3)]">Entrées — Répartition</h3>
          <div className="flex flex-col gap-3">
            {moneyInRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--fg-4)]">Pas de chiffre d’affaires</p>
            ) : (
              moneyInRows.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-[var(--fg-3)]">{r.label === "Tickets" ? "Tickets" : r.label === "Drinks" ? "Boissons" : r.label === "Snacks" ? "Snacks" : r.label === "Goods" ? "Goodies" : "Autres"}</span>
                  <MoneyBar value={r.value} max={moneyInMax} color={r.color} />
                  <span className="w-20 text-right font-mono text-xs tabular-nums">{fmtMoney(r.value)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between border-t border-[var(--line)] pt-3 text-xs font-semibold">
              <span>Total ventes</span>
              <span className="font-mono">{fmtMoney(o.revenue)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--fg-3)]">Sorties — Dépenses</h3>
          <div className="flex flex-col gap-3">
            {moneyOutRows.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="w-24 text-xs text-[var(--fg-3)]">{r.label === "Salaries" ? "Salaires" : r.label === "Operations" ? "Exploitation" : r.label === "Fixed costs" ? "Charges fixes" : "Primes / Bonus"}</span>
                <MoneyBar value={r.value} max={moneyOutMax} color={r.color} />
                <span className="w-20 text-right font-mono text-xs tabular-nums">{fmtMoney(r.value)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-[var(--line)] pt-3 text-xs font-semibold">
              <span>Total dépenses</span>
              <span className="font-mono">{fmtMoney(bossExpenses)}</span>
            </div>
            {showMoneyOutBreakdown && detailedOutRows.length > 0 && (
              <div className="mt-2 rounded bg-[var(--bg-2)] p-3">
                <p className="mb-2 text-[11px] font-medium uppercase text-[var(--fg-4)]">Détail</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {detailedOutRows.map((r) => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-[var(--fg-4)]">{r.label === "Staff food" ? "Repas staff" : r.label === "Drinks cash" ? "Boissons" : r.label === "Goodies cash" ? "Goodies" : r.label === "Animals" ? "Animaux" : r.label === "Supply" ? "Fournitures" : r.label === "Other cash" ? "Autres cash" : r.label === "Makro bank" ? "Makro banque" : "Autres banque"}</span>
                      <span className="font-mono">{fmtMoney(r.value)}</span>
                    </div>
                  ))}
                </div>
                {data.monthlyExpenses.categories.length > 0 && (
                  <div className="mt-3 border-t border-[var(--line)] pt-2">
                    <p className="mb-1 text-[11px] font-medium uppercase text-[var(--fg-4)]">Charges fixes</p>
                    {data.monthlyExpenses.categories.map((c) => (
                      <div key={c.key} className="flex justify-between text-xs">
                        <span className="text-[var(--fg-4)]">{c.label}</span>
                        <span className="font-mono">{fmtMoney(data.monthlyExpenses.totals[c.key] ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowMoneyOutBreakdown((v) => !v)}
              className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-2)] px-3 py-1.5 text-xs font-medium text-[var(--fg-3)] hover:bg-[var(--surface-2)]"
            >
              {showMoneyOutBreakdown ? "Masquer le détail" : "Voir le détail"}
              <span className="text-[10px] leading-none">{showMoneyOutBreakdown ? "▲" : "▼"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Boutiques — Résultat (défaut) / Ventes / Dépenses */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-3)]">Boutiques</h3>
            <span className="group relative inline-flex">
              <InfoIcon size={13} className="text-[var(--fg-4)] cursor-help" />
              <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--fg-3)] shadow-lg group-hover:block" style={{ marginTop: 6, maxWidth: 260, whiteSpace: "normal" }}>
                Chiffre d’affaires moins charges opérationnelles et RH enregistrées. TVA à reverser et impôt non inclus.
              </span>
            </span>
          </div>
          <div className="flex gap-1">
            {(["resultat", "sales", "expenses"] as const).map((k) => (
              <PillButton key={k} active={shopSort === k} onClick={() => setShopSort(k)}>
                {k === "resultat" ? "Résultat" : k === "sales" ? "Ventes" : "Dépenses"}
              </PillButton>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--fg-4)]">
                <th className="py-2 font-medium">Boutique</th>
                <th className="py-2 text-right font-medium">{shopSort === "resultat" ? "Résultat" : shopSort === "sales" ? "Ventes" : "Dépenses"}</th>
                <th className="py-2 w-24 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {sortedShops.map((s) => {
                const value = shopSort === "resultat" ? s._profit : shopSort === "sales" ? s.revenue : s._exp;
                const barColor = shopSort === "resultat" ? (value >= 0 ? "var(--good)" : "var(--bad)") : shopSort === "sales" ? "var(--good)" : "var(--warn)";
                const pct = shopMax > 0 ? (Math.abs(value) / shopMax) * 100 : 0;
                return (
                  <tr key={s.locationId} className="border-b border-[var(--line-2)] last:border-0">
                    <td className="py-2.5 font-medium">{shortShopName(s.locationName)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums" style={{ color: shopSort === "resultat" ? (value >= 0 ? "var(--good)" : "var(--bad)") : undefined }}>{fmtMoney(value)}</td>
                    <td className="py-2.5">
                      <div className="h-1.5 w-full rounded-full bg-[var(--line-2)]">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  tooltip,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--r-lg)",
        border: accent ? "1.5px solid var(--accent)" : "1px solid var(--line)",
        background: accent ? "var(--accent-soft, var(--surface))" : "var(--surface)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        height: "100%",
      }}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--fg-4)]">
        {label}
        {tooltip && (
          <span className="group relative inline-flex">
            <InfoIcon size={12} className="cursor-help text-[var(--fg-4)]" />
            <span className="pointer-events-none absolute left-1/2 top-full z-20 hidden -translate-x-1/2 whitespace-normal rounded-md border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-normal normal-case tracking-normal text-[var(--fg-3)] shadow-lg group-hover:block" style={{ marginTop: 6, width: 200, lineHeight: "1.4" }}>
              {tooltip}
            </span>
          </span>
        )}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums" style={{ letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}

function shortShopName(name: string): string {
  return name.replace(/^Capybara Coffee\s*/i, "").trim() || name;
}
