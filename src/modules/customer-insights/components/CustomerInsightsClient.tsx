"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiStat } from "@/components/ui/kpi-stat";
import { Panel, PanelBody } from "@/components/ui/panel";
import { ShopSingleSelect, SingleDatePicker } from "@/components/ui/filters";
import type { CustomerInsightsSummary } from "../types";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { ChannelBarChart } from "./ChannelBarChart";
import { WeeklyBarChart } from "./WeeklyBarChart";
import { UnmatchedReviewPanel } from "./UnmatchedReviewPanel";
import {
  DATE_PRESET_OPTIONS,
  detectPreset,
  getDateRangeForPreset,
  type DatePreset,
} from "../lib/date-presets";

function formatDay(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function CustomerInsightsClient() {
  const [datePreset, setDatePreset] = useState<DatePreset>("all_time");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shop, setShop] = useState("all");
  const [data, setData] = useState<CustomerInsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestId = useRef(0);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = getDateRangeForPreset(preset);
    setFrom(range.from);
    setTo(range.to);
  };

  const handleFromChange = (value: string) => {
    setFrom(value);
    setDatePreset(detectPreset(value, to));
  };

  const handleToChange = (value: string) => {
    setTo(value);
    setDatePreset(detectPreset(from, value));
  };

  const fetchData = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (shop !== "all") params.set("shop", shop);

      const res = await fetch(`/api/customer-insights/summary?${params.toString()}`);
      const json = (await res.json()) as CustomerInsightsSummary;
      if (id !== requestId.current) return;
      setData(json);
    } catch {
      if (id !== requestId.current) return;
      setData(null);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [from, to, shop]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const responseFilters = data?.meta.filtered;
  const responsePreset = responseFilters
    ? detectPreset(responseFilters.from ?? "", responseFilters.to ?? "")
    : datePreset;
  const periodLabel =
    DATE_PRESET_OPTIONS.find((option) => option.value === responsePreset)?.label ??
    "Custom range";
  const shopFiltered = (responseFilters?.shop ?? shop) !== "all";
  const scopeShop = shopFiltered ? (responseFilters?.shop ?? shop) : "All shops";
  const canonicalShops = data?.meta.shops ?? [];

  const configured = data?.meta.configured ?? false;
  const error = data?.meta.error;
  const unconfigured = !loading && !!data && !configured;
  const loadError = !loading && !!data && configured && !!error;
  const fetchFailed = !loading && !data;
  const showAnalytics = loading || (!!data && configured && !error);
  const chartsLoading = loading && !data;
  const hasData = (data?.totalSubmissions ?? 0) > 0;

  const rangeHint =
    data?.meta.dateRange.min && data?.meta.dateRange.max
      ? `Source range: ${formatDay(data.meta.dateRange.min)} – ${formatDay(
          data.meta.dateRange.max,
        )}`
      : undefined;
  const kpiHint = chartsLoading ? "Loading form responses…" : rangeHint;

  const handleShopBarClick = (label: string) => {
    if (canonicalShops.includes(label)) {
      setShop(label);
    }
  };

  const statusText = loading
    ? "Loading customer insights."
    : !data
      ? "Customer insights unavailable."
      : !data.meta.configured
        ? "Customer insights are not configured."
        : data.meta.error
          ? "Customer insights could not be loaded."
          : `Loaded ${data.totalSubmissions.toLocaleString()} submissions for ${scopeShop}, ${periodLabel}.`;

  return (
    <div className="ci">
      <header className="ui-module-header ci-header">
        <div className="ui-module-header-row">
          <h1 className="ui-module-title">Customer Insights</h1>
          <div className="ci-header-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
            >
              <RefreshCwIcon
                className={loading ? "animate-spin" : undefined}
                aria-hidden
              />
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </div>
      </header>

      {unconfigured && (
        <div className="ci-banner" data-tone="warn" role="status">
          <AlertTriangleIcon aria-hidden />
          <p>
            {error ??
              "Google account not linked. Sign in with Google (the same account used for accounting sheets) to grant spreadsheet access."}
          </p>
        </div>
      )}

      {loadError && (
        <div className="ci-banner" data-tone="negative" role="alert">
          <AlertTriangleIcon aria-hidden />
          <p>{error}</p>
        </div>
      )}

      {fetchFailed && (
        <div className="ci-banner" data-tone="negative" role="alert">
          <AlertTriangleIcon aria-hidden />
          <p>
            Could not load customer insights. Check the connection, then use Refresh to try again.
          </p>
        </div>
      )}

      <div className="ci-toolbar" role="group" aria-label="Customer insights filters">
        <div className="ci-toolbar-row">
          <label className="ci-filter" htmlFor="ci-period">
            <span className="ci-filter-label">Period</span>
            <select
              id="ci-period"
              value={datePreset}
              onChange={(event) => handlePresetChange(event.target.value as DatePreset)}
              className="ci-select"
            >
              {DATE_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="ci-filter">
            <span className="ci-filter-label">From</span>
            <SingleDatePicker value={from} onChange={handleFromChange} popoverClassName="ci-dp" />
          </label>

          <label className="ci-filter">
            <span className="ci-filter-label">To</span>
            <SingleDatePicker value={to} onChange={handleToChange} popoverClassName="ci-dp" />
          </label>
        </div>

        <div className="ci-toolbar-row">
          <div className="ci-filter ci-filter-shops">
            <span className="ci-filter-label" id="ci-shop-label">
              Shop
            </span>
            <div className="ci-pill-row" role="group" aria-labelledby="ci-shop-label">
              <ShopSingleSelect
                options={canonicalShops.map((name) => ({ id: name, name }))}
                value={shop === "all" ? "" : shop}
                onChange={(id) => setShop(id === "" ? "all" : id)}
                allowAll
              />
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusText}
      </p>

      <div className="ci-region" aria-busy={loading}>
        {showAnalytics &&
          (hasData || loading ? (
            <>
              <div className="ci-top">
                <KpiStat
                  label="Total submissions"
                  value={chartsLoading ? "—" : (data?.totalSubmissions ?? 0).toLocaleString()}
                  comparison={
                    <p className="ci-kpi-scope">
                      {scopeShop} · {periodLabel}
                    </p>
                  }
                  hint={kpiHint}
                />
                <WeeklyBarChart data={data?.byWeek ?? []} loading={chartsLoading} />
              </div>

              <div className="ci-secondary" data-single={shopFiltered ? "true" : undefined}>
                {!shopFiltered && (
                  <HorizontalBarChart
                    title="Submissions by shop"
                    data={data?.byShop ?? []}
                    loading={chartsLoading}
                    onItemClick={handleShopBarClick}
                    isClickable={(label) => canonicalShops.includes(label)}
                    clickHint="Select a row to filter the dashboard"
                    itemNoun="shops"
                  />
                )}
                <HorizontalBarChart
                  title="Top visitor countries"
                  data={data?.topCountries ?? []}
                  loading={chartsLoading}
                  emptyMessage="No country data for this period."
                  itemNoun="countries"
                />
              </div>

              <ChannelBarChart data={data?.byChannel ?? []} loading={chartsLoading} />

              {data && (
                <UnmatchedReviewPanel
                  shops={data.unmatched.shops}
                  channels={data.unmatched.channels}
                  countries={data.unmatched.countries}
                />
              )}
            </>
          ) : (
            <Panel className="ci-empty">
              <PanelBody>
                <p className="ci-empty-title">No submissions in this period.</p>
                <p className="ci-empty-copy">Try a wider date range or a different shop.</p>
              </PanelBody>
            </Panel>
          ))}
      </div>
    </div>
  );
}
