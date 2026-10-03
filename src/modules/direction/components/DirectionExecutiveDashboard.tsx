"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon, RefreshCwIcon, ShieldCheckIcon, WalletCardsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/filters/DateRangePicker";
import { ShopMultiSelect } from "@/components/ui/filters/ShopMultiSelect";
import { bangkokToday, bangkokYesterday } from "@/components/ui/filters/dates";
import type { DateRangeValue, ShopOption } from "@/components/ui/filters/types";
import type { DailyProfitResponse, DailyProfitRow } from "@/modules/reports/daily-profit/types";

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function money(value: number) {
  const rounded = Math.round(Math.abs(value));
  return value < 0 ? `(฿${numberFormatter.format(rounded)})` : `฿${numberFormatter.format(rounded)}`;
}

function dateLabel(value: string, withYear = true) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function compactDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function shiftDay(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return shifted.toISOString().slice(0, 10);
}

function diffDays(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function PeriodValue({ value, missing = false, large = false }: { value: number; missing?: boolean; large?: boolean }) {
  if (missing) return <span className="text-xl font-semibold text-[var(--fg-3)]">Non renseigné</span>;
  return (
    <span className={`font-mono font-semibold tabular-nums tracking-[-0.035em] ${large ? "text-[clamp(2.1rem,4vw,3.8rem)]" : "text-[clamp(1.7rem,3vw,2.7rem)]"}`}>
      {money(value)}
    </span>
  );
}

function LoadingDashboard() {
  return (
    <div className="grid gap-4" aria-label="Chargement des chiffres">
      <div className="h-44 animate-pulse rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface-2)]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface-2)]" />
        <div className="h-48 animate-pulse rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}

function TableCell({ row, field, missing }: { row: DailyProfitRow; field: "revenue" | "directExpenses" | "payroll" | "recurringCosts" | "serviceCharge" | "bonus" | "economicProfit"; missing?: boolean }) {
  if (missing && (field === "revenue" || field === "economicProfit")) {
    return <span className="text-[12px] text-[var(--fg-3)]">Non renseigné</span>;
  }
  const value = field === "bonus" ? (row.bonus ?? 0) : row[field];
  return (
    <span
      className="font-mono text-[12px] font-semibold tabular-nums"
      style={{ color: field === "economicProfit" ? (row.economicProfit >= 0 ? "var(--good)" : "var(--bad)") : "var(--fg)" }}
    >
      {money(value)}
    </span>
  );
}

export function DirectionExecutiveDashboard() {
  const today = useMemo(() => bangkokToday(), []);
  const yesterday = useMemo(() => bangkokYesterday(), []);
  const [period, setPeriod] = useState<DateRangeValue>({ from: yesterday, to: yesterday });
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [data, setData] = useState<DailyProfitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({
      from: period.from,
      to: period.to,
      scope_type: selectedLocationIds.length === 0 ? "group" : "location",
    });
    if (selectedLocationIds.length > 0) query.set("scope_id", selectedLocationIds.join(","));

    try {
      const response = await fetch(`/api/reports/daily-profit?${query.toString()}`, { cache: "no-store", signal });
      const payload = await response.json() as DailyProfitResponse;
      if (!response.ok) {
        throw new Error(response.status === 403 ? "Vous n’avez pas accès à ces chiffres." : "Impossible de charger les chiffres.");
      }
      setData(payload);
    } catch (loadError) {
      if ((loadError as Error).name !== "AbortError") {
        setError(loadError instanceof Error ? loadError.message : "Impossible de charger les chiffres.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [period.from, period.to, selectedLocationIds]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function shiftPeriod(amount: number) {
    const length = diffDays(period.from, period.to);
    let nextFrom = shiftDay(period.from, amount);
    let nextTo = shiftDay(period.to, amount);
    // Ne pas naviguer dans le futur : on borne la fin à aujourd'hui en gardant la durée.
    if (nextTo > today) {
      nextTo = today;
      nextFrom = shiftDay(nextTo, -length);
    }
    setPeriod({ from: nextFrom, to: nextTo });
  }

  const shopOptions: ShopOption[] = (data?.locations ?? []).map((location) => ({ id: location.id, name: location.name }));
  const sourceMissing = data ? data.daily.length === 0 || data.daily.every((row) => row.sourceStatus === "missing") : false;
  const sourcePartial = data ? data.daily.length === 0 || data.daily.some((row) => row.sourceStatus !== "complete") : false;
  const latestSheetDate = data?.coverage.latestSheetDate ?? null;
  // La borne "saisies comptables" ne doit alerter que si des jours au-delà
  // restent sans ventes (ni saisie, ni Loyverse).
  const uncoveredAfterSheets = !!data && !!latestSheetDate && data.daily.some((row) => row.date > (latestSheetDate as string) && row.sourceStatus === "missing");

  return (
    <section className="mx-auto flex w-full max-w-[1480px] flex-col gap-4" aria-labelledby="boss-dashboard-title">
      <header className="flex flex-col gap-3">
        <h1 id="boss-dashboard-title" className="text-2xl font-semibold tracking-[-0.025em] text-[var(--fg)]">Résultats estimés</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => shiftPeriod(-1)} disabled={loading} aria-label="Jour précédent">
              <ChevronLeftIcon />
            </Button>
            <DateRangePicker value={period} onChange={setPeriod} today={today} align="start" language="fr" />
            <Button variant="ghost" size="icon-sm" onClick={() => shiftPeriod(1)} disabled={loading || period.to >= today} aria-label="Jour suivant">
              <ChevronRightIcon />
            </Button>
          </div>
          <div className="flex-1" />
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCwIcon className={loading ? "animate-spin" : ""} />
            Actualiser
          </Button>
        </div>
      </header>

      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3">
        <ShopMultiSelect
          options={shopOptions}
          selected={selectedLocationIds}
          onChange={setSelectedLocationIds}
          allLabel="Toutes les boutiques"
          getLabel={(option) => option.name.replace(/^Capybara Coffee\s*/i, "").trim() || option.name}
        />
      </div>

      <div className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--fg-3)]">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
        <span>
          Estimation : les ventes viennent de Loyverse et les charges mensuelles sont réparties par jour.
          Les dépenses et mouvements de coffre non saisis peuvent faire varier le résultat.
        </span>
      </div>

      {loading && !data && <LoadingDashboard />}

      {!loading && error && (
        <Card className="gap-3 border-[var(--bad)] bg-[var(--bad-soft)]">
          <CardTitle>Les chiffres ne sont pas disponibles</CardTitle>
          <CardDescription className="text-[var(--bad)]">{error}</CardDescription>
          <Button variant="secondary" className="w-fit" onClick={() => void load()}>Réessayer</Button>
        </Card>
      )}

      {data && (
        <>
          {(sourcePartial || uncoveredAfterSheets) && (
            <div className="flex items-center gap-2 rounded-[var(--r-sm)] border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-3 py-2 text-[12px] text-[var(--warn)]">
              <InfoIcon className="size-4 shrink-0" />
              {uncoveredAfterSheets && latestSheetDate
                ? `Saisies comptables jusqu’au ${dateLabel(latestSheetDate)} — ventes au-delà via Loyverse.`
                : "Certaines boutiques ou journées ne sont pas renseignées sur cette période."}
            </div>
          )}
          {data.coverage.missingCostSetup.length > 0 && (
            <div className="flex items-center gap-2 rounded-[var(--r-sm)] border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-3 py-2 text-[12px] text-[var(--warn)]">
              <InfoIcon className="size-4 shrink-0" />
              Certaines charges mensuelles ne sont pas renseignées pour cette période.
            </div>
          )}

          <Card className="relative p-0">
            <div className="absolute inset-y-0 left-0 w-1 bg-[var(--accent)]" aria-hidden="true" />
            <CardContent className="grid items-stretch md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.25fr)]">
              <div className="flex min-h-32 flex-col justify-center gap-2 p-5 sm:p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-3)]">Ventes</span>
                <PeriodValue value={data.summary.revenue} missing={sourceMissing} />
              </div>
              <div className="flex items-center justify-center border-y border-[var(--line)] py-1 text-2xl text-[var(--fg-4)] md:border-x md:border-y-0 md:px-4">−</div>
              <div className="flex min-h-32 flex-col justify-center gap-2 p-5 sm:p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-3)]">Dépenses estimées</span>
                <PeriodValue value={data.summary.totalCosts} />
              </div>
              <div className="flex items-center justify-center border-y border-[var(--line)] py-1 text-2xl text-[var(--fg-4)] md:border-x md:border-y-0 md:px-4">=</div>
              <div className="flex min-h-36 flex-col justify-center gap-2 bg-[var(--surface-2)] p-5 sm:p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--fg-3)]">Résultat estimé</span>
                <div style={{ color: data.summary.economicProfit >= 0 ? "var(--good)" : "var(--bad)" }}>
                  <PeriodValue value={data.summary.economicProfit} missing={sourceMissing} large />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card flush>
            <div className="border-b border-[var(--line)] px-4 py-4 sm:px-5">
              <CardTitle className="text-[15px]">Détail quotidien</CardTitle>
              <CardDescription>Ventes, charges et résultat estimé — même lecture que l’onglet Résultat quotidien</CardDescription>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "left" }}>Date</th>
                    <th style={thStyle}>Chiffre d’affaires</th>
                    <th style={thStyle}>Charges d’exploitation</th>
                    <th style={thStyle}>Salaires</th>
                    <th style={thStyle}>Charges fixes</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Prime</th>
                    <th style={thStyle}>Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((row) => {
                    const missing = row.sourceStatus === "missing";
                    return (
                      <tr key={row.date} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={tdLeft}>
                          <span className="capitalize">{compactDateLabel(row.date)}</span>
                          {row.sourceStatus !== "complete" && (
                            <span className="block text-[10px] font-medium text-[var(--warn)]">
                              {row.sourceStatus === "partial" ? "Données partielles" : "Ventes non renseignées"}
                            </span>
                          )}
                        </td>
                        <td style={tdNumber}><TableCell row={row} field="revenue" missing={missing} /></td>
                        <td style={tdNumber}><TableCell row={row} field="directExpenses" /></td>
                        <td style={tdNumber}><TableCell row={row} field="payroll" /></td>
                        <td style={tdNumber}><TableCell row={row} field="recurringCosts" /></td>
                        <td style={tdNumber}><TableCell row={row} field="serviceCharge" /></td>
                        <td style={tdNumber}><TableCell row={row} field="bonus" /></td>
                        <td style={tdNumber}><TableCell row={row} field="economicProfit" missing={missing} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.daily.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-[var(--fg-3)]">Aucune donnée pour cette période.</p>}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Card className="gap-1">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-[15px]"><WalletCardsIcon className="size-4 text-[var(--accent)]" /> Coffre au {dateLabel(period.to, false)}</CardTitle>
                  <CardDescription>Dernier montant connu pour chaque boutique</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-[var(--line)]">
                {data.cashSafes.length === 0 && <p className="py-5 text-[13px] text-[var(--fg-3)]">Aucune boutique sélectionnée.</p>}
                {data.cashSafes.map((safe) => (
                  <div key={safe.locationId} className="flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-1">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[var(--fg)]">{safe.locationName.replace(/^Capybara Coffee\s*/i, "").trim() || safe.locationName}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--fg-3)]">
                        {!safe.asOf ? "Non renseigné" : safe.isStale ? `Dernière saisie le ${dateLabel(safe.asOf)}` : `À jour au ${dateLabel(safe.asOf)}`}
                      </p>
                    </div>
                    <span className={`shrink-0 font-mono text-lg font-semibold tabular-nums ${safe.amount === null ? "text-[var(--fg-3)]" : "text-[var(--fg)]"}`}>
                      {safe.amount === null ? "Non renseigné" : money(safe.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="gap-1">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                onClick={() => setBreakdownOpen((open) => !open)}
                aria-expanded={breakdownOpen}
              >
                <span>
                  <CardTitle className="text-[15px]">Détail des dépenses estimées</CardTitle>
                  <CardDescription>{money(data.summary.totalCosts)} sur la période</CardDescription>
                </span>
                <ChevronDownIcon className={`mt-1 size-4 text-[var(--fg-3)] transition-transform ${breakdownOpen ? "rotate-180" : ""}`} />
              </button>
              {breakdownOpen && (
                <CardContent className="mt-3 grid gap-x-8 sm:grid-cols-2">
                  {data.expenseBreakdown.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 border-t border-[var(--line)] py-3">
                      <span className="text-[12px] text-[var(--fg-2)]">{item.label}</span>
                      <span className="font-mono text-[13px] font-semibold tabular-nums">{money(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 border-t border-[var(--line)] py-3 text-[11px] text-[var(--fg-3)] sm:col-span-2">
                    <ShieldCheckIcon className="size-4 text-[var(--accent)]" />
                    Le total de ce détail correspond aux dépenses affichées ci-dessus.
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </>
      )}
    </section>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const thStyle: React.CSSProperties = { padding: "8px 12px", color: "var(--fg-4)", fontWeight: 500, textAlign: "right", background: "var(--bg-2)", whiteSpace: "nowrap" };
const tdLeft: React.CSSProperties = { padding: "8px 12px", whiteSpace: "nowrap" };
const tdNumber: React.CSSProperties = { padding: "8px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" };
