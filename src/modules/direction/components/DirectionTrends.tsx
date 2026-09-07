"use client";

import { useEffect, useState } from "react";
import { PillButton } from "@/components/ui/pill-button";
import { useDirectionShops } from "@/modules/direction/lib/useDirectionPeriod";

function fmtM(n: number) {
  return `${(n / 1_000_000).toFixed(2)}M`;
}

const PLACEHOLDER = [
  { m: "Jan", mLong: "Janvier", sales26: 6_200_000, sales25: 5_500_000, exp26: 2_800_000, exp25: 2_500_000, profit26: 3_400_000, profit25: 3_000_000 },
  { m: "Fév", mLong: "Février", sales26: 6_800_000, sales25: 5_900_000, exp26: 3_000_000, exp25: 2_700_000, profit26: 3_800_000, profit25: 3_200_000 },
  { m: "Mar", mLong: "Mars", sales26: 7_100_000, sales25: 6_000_000, exp26: 3_100_000, exp25: 2_800_000, profit26: 4_000_000, profit25: 3_200_000 },
  { m: "Avr", mLong: "Avril", sales26: 7_500_000, sales25: 6_400_000, exp26: 3_200_000, exp25: 2_900_000, profit26: 4_300_000, profit25: 3_500_000 },
  { m: "Mai", mLong: "Mai", sales26: 7_900_000, sales25: 6_700_000, exp26: 3_350_000, exp25: 2_950_000, profit26: 4_550_000, profit25: 3_750_000 },
  { m: "Juin", mLong: "Juin", sales26: 8_200_000, sales25: 7_000_000, exp26: 3_400_000, exp25: 3_000_000, profit26: 4_800_000, profit25: 4_000_000 },
  { m: "Juil", mLong: "Juillet", sales26: 8_500_000, sales25: 7_200_000, exp26: 3_500_000, exp25: 3_050_000, profit26: 5_000_000, profit25: 4_150_000 },
  { m: "Août", mLong: "Août", sales26: 8_870_000, sales25: 7_470_000, exp26: 3_645_000, exp25: 3_100_000, profit26: 5_225_000, profit25: 4_370_000 },
  { m: "Sep", mLong: "Septembre", sales26: 2_100_000, sales25: 6_900_000, exp26: 900_000, exp25: 3_000_000, profit26: 1_200_000, profit25: 3_900_000 },
  { m: "Oct", mLong: "Octobre", sales26: 0, sales25: 7_100_000, exp26: 0, exp25: 3_100_000, profit26: 0, profit25: 4_000_000 },
  { m: "Nov", mLong: "Novembre", sales26: 0, sales25: 6_800_000, exp26: 0, exp25: 3_000_000, profit26: 0, profit25: 3_800_000 },
  { m: "Déc", mLong: "Décembre", sales26: 0, sales25: 7_300_000, exp26: 0, exp25: 3_200_000, profit26: 0, profit25: 4_100_000 },
];

function pct(a: number, b: number) {
  if (!b) return null;
  return ((a - b) / b) * 100;
}

export function DirectionTrends() {
  const aug = PLACEHOLDER[7];
  const expPct = pct(aug.exp26, aug.exp25);
  const salesPct = pct(aug.sales26, aug.sales25);
  const maxSales = Math.max(...PLACEHOLDER.map((p) => Math.max(p.sales26, p.sales25)), 1);

  // Boutiques — persistant via hook
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const { selectedShops, setSelectedShops } = useDirectionShops();
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/reports/accounting?from=2026-08-01&to=2026-08-31&locations=all", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { locations: { id: string; name: string }[] }) => {
        setLocations(j.locations ?? []);
        if (selectedShops.length === 0) setSelectedShops((j.locations ?? []).map((l) => l.id));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function shortName(name: string) {
    return name.replace(/^Capybara Coffee\s*/i, "").trim() || name;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Sélecteur boutiques */}
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
              {shortName(loc.name)}
            </PillButton>
          ))}
        </div>
      )}

      {/* Cartes résumé — Ventes / Dépenses seulement, vs montant sous le % */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--fg-4)]">Ventes</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums">฿{fmtM(aug.sales26)}</p>
          <p className="mt-1 text-xs font-medium" style={{ color: salesPct !== null && salesPct > 0 ? "var(--good)" : "var(--bad)" }}>{salesPct !== null ? `${salesPct > 0 ? "+" : ""}${salesPct.toFixed(1)}% vs N-1` : "— vs N-1"}</p>
          <p className="text-xs text-[var(--fg-4)]">vs ฿{fmtM(aug.sales25)} en N-1</p>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--fg-4)]">Dépenses</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums">฿{fmtM(aug.exp26)}</p>
          <p className="mt-1 text-xs font-medium" style={{ color: "var(--warn)" }}>{expPct !== null ? `${expPct > 0 ? "+" : ""}${expPct.toFixed(1)}% vs N-1` : "— vs N-1"}</p>
          <p className="text-xs text-[var(--fg-4)]">vs ฿{fmtM(aug.exp25)} en N-1</p>
        </div>
      </div>

      {/* Graphique — Ventes par mois avec hover tooltip */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-3)]">Ventes par mois — 2026 vs 2025</h3>
        <div className="relative mt-4 flex items-end gap-1" style={{ height: 150 }}>
          {PLACEHOLDER.map((p, idx) => (
            <div
              key={p.m}
              className="relative flex flex-1 flex-col items-center gap-1"
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 110 }}>
                <div className="w-full rounded-t transition-all" style={{ height: `${(p.sales26 / maxSales) * 100}%`, background: "var(--accent)", opacity: hovered === idx ? 1 : p.sales26 ? 0.95 : 0.15 }} />
                <div className="w-full rounded-t transition-all" style={{ height: `${(p.sales25 / maxSales) * 100}%`, background: "#f59e0b", opacity: hovered === idx ? 0.95 : 0.85 }} />
              </div>
              <span className="text-[10px] text-[var(--fg-4)]">{p.m}</span>
              {hovered === idx && (
                <div
                  className="pointer-events-none absolute z-10 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 shadow-lg"
                  style={{ bottom: 125, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}
                >
                  <p className="text-xs font-semibold">{p.mLong}</p>
                  <p className="font-mono text-xs"><span style={{ color: "var(--accent)" }}>● 2026 :</span> ฿{fmtM(p.sales26)}</p>
                  <p className="font-mono text-xs"><span style={{ color: "#f59e0b" }}>● 2025 :</span> ฿{fmtM(p.sales25)}</p>
                  {pct(p.sales26, p.sales25) !== null && (
                    <p className="text-xs font-medium" style={{ color: (pct(p.sales26, p.sales25) ?? 0) > 0 ? "var(--good)" : "var(--bad)" }}>
                      {pct(p.sales26, p.sales25)! > 0 ? "+" : ""}{pct(p.sales26, p.sales25)!.toFixed(1)}% vs N-1
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4 text-xs">
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm" style={{ background: "var(--accent)" }} /> 2026</span>
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm" style={{ background: "#f59e0b" }} /> 2025</span>
        </div>
      </div>

      {/* Tableau annuel — Ventes seulement */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-3)]">Tableau annuel — Ventes</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--fg-4)]">
                <th className="py-2 font-medium">Mois</th>
                <th className="py-2 text-right font-medium">Ventes 26</th>
                <th className="py-2 text-right font-medium">Ventes 25</th>
                <th className="py-2 text-right font-medium">Évolution</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER.map((p) => {
                const ch = pct(p.sales26, p.sales25);
                return (
                  <tr key={p.m} className="border-b border-[var(--line-2)] last:border-0">
                    <td className="py-2 font-medium">{p.mLong}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{p.sales26 ? `฿${fmtM(p.sales26)}` : "—"}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-[var(--fg-4)]">฿{fmtM(p.sales25)}</td>
                    <td className="py-2 text-right font-mono tabular-nums" style={{ color: ch !== null && ch > 0 ? "var(--good)" : ch !== null && ch < 0 ? "var(--bad)" : "var(--fg-4)" }}>{ch !== null ? `${ch > 0 ? "+" : ""}${ch.toFixed(1)}%` : "—"}</td>
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
