import type { LocationOverview } from "@/modules/challenges/overview-data";
import {
  CHALLENGE_LABELS,
  LEGEND_ITEMS,
  PERIOD_LABELS,
  TEAM_CHALLENGE_LABELS,
  TEAM_LEGEND_ITEMS,
} from "./labels";
import {
  SNACKS_BONUS,
  PANIER_BONUS,
  OPEX_BONUS,
  REVIEWS_VOLUME_BONUS,
  REVIEWS_RATING_BONUS,
} from "./constants";
import type { MetricContext } from "./metric-context";
import { buildTeamMetrics, shortLocationName } from "./team-metrics";
import {
  buildRevenueContext,
  buildMerchContext,
  buildSnacksContext,
  buildPanierContext,
  buildOpexContext,
  buildReviewVolumeContext,
  buildReviewRatingContext,
} from "./metric-context";

const MERCH_TIER_LABELS = ["—", "7%+ (P1)", "8%+ (P2)", "9%+ (P3)"];

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortName(title: string): string {
  return title.replace(/^Capybara Coffee\s*/i, "").trim() || title;
}

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function pct(n: number | null): string {
  if (n === null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function statusSymbol(passes: boolean | null): string {
  if (passes === true) return '<span class="pass">✓</span>';
  if (passes === false) return '<span class="fail">✗</span>';
  return '<span class="muted">—</span>';
}

function bonusCell(
  passes: boolean | null,
  bonus: number,
  locked: boolean,
  potentialBonus: number,
  teamMode?: boolean,
): string {
  if (passes === true && locked) {
    if (teamMode) {
      return `<span class="locked">${escHtml(CHALLENGE_LABELS.lockedUntilSalesTarget)}</span>`;
    }
    return `<span class="locked">Locked ${potentialBonus.toLocaleString()} ฿</span>`;
  }
  if (passes === true && bonus > 0) {
    return `<span class="pass">${bonus.toLocaleString()} ฿</span>`;
  }
  return "";
}

function teamContextHtml(ctx: MetricContext): string {
  const hint = ctx.hint ? `<br><span class="muted">${escHtml(ctx.hint)}</span>` : "";
  return `<strong>${escHtml(ctx.value)}</strong>${hint}`;
}

function metricSummaryCell(
  passes: boolean | null,
  value: string,
  bonus: number,
  locked: boolean,
  potentialBonus: number,
  teamMode?: boolean,
  teamContext?: MetricContext,
): string {
  const status = statusSymbol(passes);
  const bonusText = bonusCell(passes, bonus, locked, potentialBonus, teamMode);
  const valueHtml = teamMode && teamContext ? teamContextHtml(teamContext) : escHtml(value);
  return `${status} ${valueHtml}${bonusText ? `<br>${bonusText}` : ""}`;
}

function salesTargetCell(loc: LocationOverview, teamMode?: boolean): string {
  if (teamMode) {
    const ctx = buildRevenueContext(loc);
    const { unlocked } = loc.revenue;
    const status =
      unlocked === true
        ? '<span class="pass">Reached</span>'
        : unlocked === false
          ? '<span class="locked">Not reached</span>'
          : "";
    return `${statusSymbol(unlocked === true ? true : unlocked === false ? false : null)} ${teamContextHtml(ctx)}${status ? `<br>${status}` : ""}`;
  }

  const { amount, threshold, unlocked } = loc.revenue;
  if (threshold === null) {
    const amountStr = amount !== null ? fmt(amount, 0) : "—";
    return `<span class="muted">${amountStr} / ${escHtml(CHALLENGE_LABELS.salesTargetTbd)}</span>`;
  }
  const amountStr = amount !== null ? fmt(amount, 0) : "—";
  const thresholdStr = fmt(threshold, 0);
  if (unlocked === true) {
    return `<span class="pass">✓</span> ${amountStr} / ${thresholdStr} ฿<br><span class="pass">Reached</span>`;
  }
  if (unlocked === false) {
    return `<span class="fail">✗</span> ${amountStr} / ${thresholdStr} ฿<br><span class="locked">Not reached</span>`;
  }
  return `${amountStr} / ${thresholdStr} ฿`;
}

function buildSummaryRows(locations: LocationOverview[], teamMode?: boolean): string {
  return locations
    .map((loc, idx) => {
      const revenueLocked = loc.revenue.threshold !== null && loc.revenue.unlocked === false;
      const merchPasses = loc.merchandising.tier > 0 ? true : loc.merchandising.ratio !== null ? false : null;
      const rowCls = idx % 2 === 1 ? ' class="alt"' : "";

      return `<tr${rowCls}>
        <td class="shop">${escHtml(shortName(loc.locationTitle))}</td>
        <td>${salesTargetCell(loc, teamMode)}</td>
        <td class="bonus-total">${loc.totalBonus > 0 ? `<span class="pass">${loc.totalBonus.toLocaleString()} ฿</span>` : '<span class="muted">0 ฿</span>'}</td>
        <td>${metricSummaryCell(merchPasses, pct(loc.merchandising.ratio), loc.merchandising.bonus, false, 0, teamMode, teamMode ? buildMerchContext(loc) : undefined)}</td>
        <td>${metricSummaryCell(loc.snacks.passes, loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—", loc.snacks.bonus, revenueLocked, SNACKS_BONUS, teamMode, teamMode ? buildSnacksContext(loc) : undefined)}</td>
        <td>${metricSummaryCell(loc.panierMoyen.passes, loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—", loc.panierMoyen.bonus, revenueLocked, PANIER_BONUS, teamMode, teamMode ? buildPanierContext(loc) : undefined)}</td>
        <td>${metricSummaryCell(loc.opex.passes, pct(loc.opex.ratio), loc.opex.bonus, revenueLocked, OPEX_BONUS, teamMode, teamMode ? buildOpexContext(loc) : undefined)}</td>
        <td>${metricSummaryCell(loc.reviews.volumePass, loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`, loc.reviews.volumeBonus, revenueLocked, REVIEWS_VOLUME_BONUS, teamMode, teamMode ? buildReviewVolumeContext(loc) : undefined)}</td>
        <td>${metricSummaryCell(loc.reviews.ratingPass, loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : "—", loc.reviews.ratingBonus, revenueLocked, REVIEWS_RATING_BONUS, teamMode, teamMode ? buildReviewRatingContext(loc) : undefined)}</td>
      </tr>`;
    })
    .join("");
}

interface MetricDetail {
  label: string;
  value: string;
  target: string;
  passes: boolean | null;
  bonus: number;
  locked: boolean;
  potentialBonus: number;
}

function buildMetricDetails(loc: LocationOverview, teamMode?: boolean): MetricDetail[] {
  const revenueLocked = loc.revenue.threshold !== null && loc.revenue.unlocked === false;
  const merchPasses = loc.merchandising.tier > 0 ? true : loc.merchandising.ratio !== null ? false : null;
  const merchTarget = loc.merchandising.tier > 0 ? MERCH_TIER_LABELS[loc.merchandising.tier] : "≥ 7%";
  const merchCtx = buildMerchContext(loc);
  const snacksCtx = buildSnacksContext(loc);
  const panierCtx = buildPanierContext(loc);
  const opexCtx = buildOpexContext(loc);
  const reviewVolCtx = buildReviewVolumeContext(loc);
  const reviewRatingCtx = buildReviewRatingContext(loc);

  return [
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.productsPct : CHALLENGE_LABELS.productsPct,
      value: teamMode ? merchCtx.value : pct(loc.merchandising.ratio),
      target: teamMode ? (merchCtx.hint ?? merchTarget) : merchTarget,
      passes: merchPasses,
      bonus: loc.merchandising.bonus,
      locked: false,
      potentialBonus: 0,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.snacks : CHALLENGE_LABELS.snacks,
      value: teamMode ? snacksCtx.value : loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—",
      target: teamMode ? (snacksCtx.hint ?? "≥ 0.45") : "≥ 0.45",
      passes: loc.snacks.passes,
      bonus: loc.snacks.bonus,
      locked: revenueLocked,
      potentialBonus: SNACKS_BONUS,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.spendPerVisit : CHALLENGE_LABELS.spendPerVisit,
      value: teamMode ? panierCtx.value : loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—",
      target: teamMode ? (panierCtx.hint ?? "≥ 190 ฿") : "≥ 190 ฿",
      passes: loc.panierMoyen.passes,
      bonus: loc.panierMoyen.bonus,
      locked: revenueLocked,
      potentialBonus: PANIER_BONUS,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.runningCostsPct : CHALLENGE_LABELS.runningCostsPct,
      value: teamMode ? opexCtx.value : pct(loc.opex.ratio),
      target: teamMode ? (opexCtx.hint ?? "< 9.5%") : "< 9.5%",
      passes: loc.opex.passes,
      bonus: loc.opex.bonus,
      locked: revenueLocked,
      potentialBonus: OPEX_BONUS,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.reviewCount : CHALLENGE_LABELS.reviewCount,
      value: teamMode ? reviewVolCtx.value : loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`,
      target: teamMode ? (reviewVolCtx.hint ?? "≥ 4%") : "≥ 4%",
      passes: loc.reviews.volumePass,
      bonus: loc.reviews.volumeBonus,
      locked: revenueLocked,
      potentialBonus: REVIEWS_VOLUME_BONUS,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.reviewRating : CHALLENGE_LABELS.reviewRating,
      value: teamMode ? reviewRatingCtx.value : loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : "—",
      target: teamMode
        ? (reviewRatingCtx.hint ?? "—")
        : loc.reviews.currentRating > 0 && loc.reviews.ratingTarget > 0
          ? `≥ ${loc.reviews.ratingTarget.toFixed(1)}`
          : "—",
      passes: loc.reviews.ratingPass,
      bonus: loc.reviews.ratingBonus,
      locked: revenueLocked,
      potentialBonus: REVIEWS_RATING_BONUS,
    },
  ];
}

function buildLocationBlock(loc: LocationOverview, teamMode?: boolean): string {
  const { amount, threshold, unlocked } = loc.revenue;
  const name = escHtml(shortName(loc.locationTitle));
  const totalBonusCls = loc.totalBonus > 0 ? "pass" : "muted";

  let gateHtml = "";
  if (threshold !== null) {
    const gateCls = unlocked === true ? "gate-unlocked" : "gate-locked";
    const gateLabel = teamMode
      ? unlocked === true
        ? TEAM_CHALLENGE_LABELS.salesTargetReached
        : TEAM_CHALLENGE_LABELS.salesTarget
      : unlocked === true
        ? CHALLENGE_LABELS.salesTargetReached
        : CHALLENGE_LABELS.salesTarget;

    if (teamMode) {
      const ctx = buildRevenueContext(loc);
      gateHtml = `<div class="${gateCls}">
        <strong>${escHtml(gateLabel)}</strong> — ${teamContextHtml(ctx)}
      </div>`;
    } else {
      const amountStr = amount !== null ? fmt(amount, 0) : "—";
      gateHtml = `<div class="${gateCls}">
        <strong>${escHtml(gateLabel)}</strong> — ${amountStr} / ${fmt(threshold, 0)} ฿
      </div>`;
    }
  }

  const targetHeader = teamMode ? "Hint" : "Target";
  const metricHeader = teamMode ? "Challenge" : "Metric";
  const valueHeader = teamMode ? "Progress" : "Value";

  const metricRows = buildMetricDetails(loc, teamMode)
    .map((m) => {
      const bonusHtml = bonusCell(m.passes, m.bonus, m.locked, m.potentialBonus, teamMode);
      return `<tr>
        <td>${escHtml(m.label)}</td>
        <td class="num">${escHtml(m.value)}</td>
        <td class="muted">${escHtml(m.target)}</td>
        <td>${statusSymbol(m.passes)}</td>
        <td class="num">${bonusHtml}</td>
      </tr>`;
    })
    .join("");

  const periodRows = ([0, 1, 2] as const)
    .map((i) => {
      const entries = [loc.entryCountP1, loc.entryCountP2, loc.entryCountP3][i];
      const snacks = [loc.snacksSoldP1, loc.snacksSoldP2, loc.snacksSoldP3][i];
      return `<tr>
        <td>${escHtml(PERIOD_LABELS.table[i])}</td>
        <td class="num">${entries !== null ? fmt(entries, 0) : "—"}</td>
        <td class="num">${snacks !== null ? fmt(snacks, 0) : "—"}</td>
      </tr>`;
    })
    .join("");

  const visitorLabel = teamMode ? TEAM_CHALLENGE_LABELS.visitorCounts : CHALLENGE_LABELS.visitorCounts;

  return `<div class="location-block">
    <h2>${name} — <span class="${totalBonusCls}">${loc.totalBonus.toLocaleString()} ฿</span></h2>
    ${gateHtml}
    <table class="detail-table">
      <thead><tr><th>${metricHeader}</th><th>${valueHeader}</th><th>${targetHeader}</th><th>Status</th><th>Bonus</th></tr></thead>
      <tbody>${metricRows}</tbody>
    </table>
    <h3>${escHtml(visitorLabel)}</h3>
    <table class="detail-table">
      <thead><tr><th>Period</th><th>Visitors</th><th>Animal food sold</th></tr></thead>
      <tbody>${periodRows}</tbody>
    </table>
  </div>`;
}

function buildLegend(teamMode?: boolean): string {
  const items = teamMode ? TEAM_LEGEND_ITEMS : LEGEND_ITEMS;
  return items
    .map(
      (item) =>
        `<div class="legend-item">
        <span class="legend-label">${escHtml(item.label)}</span>
        <span class="legend-max">${escHtml(item.max)}</span>
        <span class="legend-tiers">${escHtml(item.tiers)}</span>
      </div>`,
    )
    .join("");
}

const PRINT_CSS = [
  "*{box-sizing:border-box;margin:0;padding:0}",
  "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:10px;color:#1a1a1a;background:#fff}",
  ".accent{height:5px;background:#1e3a8a;width:100%}",
  ".header{padding:14px 20px 10px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e5e7eb}",
  ".header-left h1{font-size:15px;font-weight:700;color:#111;margin-bottom:3px}",
  ".header-left .meta{font-size:11px;color:#6b7280}",
  ".header-right{text-align:right;font-size:10px;color:#9ca3af}",
  ".content{padding:12px 20px}",
  "h2{font-size:12px;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}",
  "h3{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:10px 0 4px}",
  "table{border-collapse:collapse;width:100%}",
  "th{background:#1e3a8a;color:#fff;font-weight:600;font-size:9px;padding:5px 6px;text-align:left;letter-spacing:0.2px}",
  "th.num,td.num{text-align:right}",
  "td{padding:5px 6px;border-bottom:1px solid #f0f0f0;font-variant-numeric:tabular-nums;vertical-align:top;font-size:9.5px}",
  "tr.alt td{background:#f8fafc}",
  "td.shop{font-weight:600;color:#374151}",
  "td.bonus-total{font-weight:700}",
  ".pass{color:#16a34a;font-weight:700}",
  ".fail{color:#dc2626;font-weight:700}",
  ".locked{color:#b45309;font-weight:600}",
  ".warn{color:#d97706;font-weight:600}",
  ".muted{color:#9ca3af}",
  ".gate-unlocked{border:1px solid #16a34a;background:#f0fdf4;padding:6px 10px;border-radius:4px;margin-bottom:8px;font-size:9.5px}",
  ".gate-locked{border:1px solid #b45309;background:#fffbeb;padding:6px 10px;border-radius:4px;margin-bottom:8px;font-size:9.5px}",
  ".location-block{margin-top:0;padding-top:16px;page-break-inside:avoid;page-break-after:always;break-inside:avoid;break-after:page}",
  ".location-block:last-of-type{page-break-after:auto;break-after:auto}",
  ".summary-table{page-break-after:always;break-after:page}",
  ".detail-table{margin-bottom:4px}",
  ".legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb}",
  ".legend-item{display:flex;flex-direction:column;gap:1px;border:1px solid #e5e7eb;border-radius:4px;padding:6px 10px;min-width:120px}",
  ".legend-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280}",
  ".legend-max{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}",
  ".legend-tiers{font-size:9px;color:#9ca3af}",
  "@media print{@page{margin:8mm;size:landscape}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
].join("");

const TEAM_PRINT_CSS = [
  "*{box-sizing:border-box;margin:0;padding:0}",
  "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:10.5px;color:#111827;background:#fff}",
  ".page{padding:14px 18px}",
  ".cover{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #111827}",
  ".cover-title{font-size:16px;font-weight:800;color:#111827}",
  ".cover-sub{font-size:10px;color:#6b7280;margin-top:2px}",
  ".cover-meta{font-size:9px;color:#6b7280;text-align:right}",
  ".dashboard{margin-bottom:20px;padding:16px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;page-break-inside:avoid}",
  ".dash-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}",
  ".dash-title{font-size:20px;font-weight:800;color:#111827}",
  ".dash-subtitle{font-size:10px;color:#6b7280;margin-top:1px}",
  ".dash-logo{font-size:8px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;text-align:right}",
  ".how{border:1px solid #e5e7eb;background:#f9fafb;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:9.5px;line-height:1.5;color:#374151}",
  ".how strong{color:#111827}",
  ".how .dot{display:inline-block;min-width:86px;font-weight:700;border-radius:999px;padding:1px 8px;font-size:8.5px;margin-right:4px;text-align:center}",
  ".dot-earned{background:#dcfce7;color:#15803d}",
  ".dot-waiting{background:#fef3c7;color:#92400e}",
  ".dot-missed{background:#f3f4f6;color:#4b5563}",
  ".kpi-row{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px;margin-bottom:12px}",
  ".kpi-card{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#fff}",
  ".kpi-card.sales{border-top:3px solid #111827}",
  ".kpi-card.earned{border-top:3px solid #15803d;background:#f0fdf4}",
  ".kpi-card.waiting{border-top:3px solid #d97706;background:#fffbeb}",
  ".kpi-label{font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#6b7280}",
  ".kpi-value{font-size:17px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:3px;color:#111827}",
  ".kpi-value.small{font-size:17px}",
  ".kpi-target{font-size:10px;font-weight:600;color:#6b7280}",
  ".kpi-sub{font-size:8.5px;color:#6b7280;margin-top:3px;line-height:1.4}",
  ".kpi-bar{height:6px;border-radius:999px;background:#f3f4f6;margin-top:8px;overflow:hidden}",
  ".kpi-bar-fill{height:100%;border-radius:999px}",
  ".sales-status{margin-top:6px;font-size:9.5px;font-weight:700}",
  ".section-title{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin:12px 0 6px}",
  ".section-hint{font-size:9px;color:#6b7280;margin:-3px 0 6px}",
  ".metric-table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:4px;overflow:hidden}",
  ".metric-table th{background:#111827;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#fff;padding:6px 8px;text-align:right}",
  ".metric-table th:first-child{text-align:left;padding-left:10px}",
  ".metric-table td{padding:7px 8px;border-bottom:1px solid #f3f4f6;vertical-align:middle;font-variant-numeric:tabular-nums}",
  ".metric-table tr:last-child td{border-bottom:none}",
  ".metric-table td.num{text-align:right;font-size:12px;font-weight:700;color:#111827;white-space:nowrap}",
  ".metric-table td.target{text-align:right;font-size:9px;color:#4b5563;white-space:nowrap}",
  ".metric-table td.status-cell{text-align:right;white-space:nowrap}",
  ".metric-table td.bonus-cell{text-align:right;font-size:10px;font-weight:700;white-space:nowrap}",
  ".pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:8.5px;font-weight:800;white-space:nowrap}",
  ".pill-earned{background:#dcfce7;color:#15803d}",
  ".pill-waiting{background:#fef3c7;color:#92400e}",
  ".pill-missed{background:#f3f4f6;color:#4b5563}",
  ".pill-nodata{background:#fff;border:1px solid #e5e7eb;color:#9ca3af}",
  ".metric-name{font-size:9.5px;font-weight:700;color:#111827}",
  ".metric-sub{font-size:7.5px;color:#6b7280;line-height:1.3;margin-top:1px}",
  ".bonus-earned{color:#15803d}",
  ".bonus-waiting{color:#92400e}",
  ".bonus-max{color:#9ca3af;font-weight:600}",
  ".advice-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:6px}",
  ".advice-card{border:1px solid #e5e7eb;border-radius:6px;padding:7px 8px;background:#fafafa}",
  ".advice-card .title{font-size:8.5px;font-weight:800;margin-bottom:3px;color:#111827}",
  ".advice-card .gap{font-size:8px;font-weight:700;margin:4px 0;padding:3px 6px;border-radius:4px;display:inline-block}",
  ".advice-card .tip{font-size:7.5px;color:#4b5563;line-height:1.4}",
  ".footer{text-align:center;font-size:8.5px;font-style:italic;color:#9ca3af;padding-top:8px;border-top:1px solid #f3f4f6;margin-top:8px}",
  ".pass{color:#15803d}.warn{color:#92400e}.muted{color:#6b7280}",
  "@media print{@page{margin:8mm;size:portrait}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.dashboard{page-break-after:always}.dashboard:last-child{page-break-after:auto}}",
].join("");

type TeamRowStatus = "earned" | "waiting" | "missed" | "nodata";

function teamStatusPill(status: TeamRowStatus): string {
  if (status === "earned") return '<span class="pill pill-earned">Earned ✓</span>';
  if (status === "waiting") return '<span class="pill pill-waiting">Waiting for sales</span>';
  if (status === "missed") return '<span class="pill pill-missed">Not yet</span>';
  return '<span class="pill pill-nodata">No data</span>';
}

function isMonthPast(month: string): boolean {
  const [y, m] = month.split("-").map(Number);
  const now = new Date();
  return y < now.getFullYear() || (y === now.getFullYear() && m - 1 < now.getMonth());
}

function salesTargetLabel(
  unlocked: boolean,
  ratio: number | null,
  month: string,
  amount: number | null,
  threshold: number | null,
): { label: string; cls: string } {
  if (unlocked) return { label: "Sales target reached ✓", cls: "pass" };
  if (isMonthPast(month)) return { label: "Sales target missed", cls: "muted" };
  if (ratio !== null && ratio >= 0.9) return { label: "Almost there — keep pushing!", cls: "warn" };
  if (amount !== null && threshold !== null && amount < threshold) {
    return { label: `${fmt(threshold - amount, 0)} ฿ left to reach the target`, cls: "muted" };
  }
  return { label: "In progress", cls: "muted" };
}

const MERCH_BONUS_BY_TIER = [0, 1500, 3000, 5000] as const;

function buildTeamDashboardBlock(loc: LocationOverview, month: string): string {
  const name = escHtml(shortLocationName(loc.locationTitle));
  const { amount, threshold, unlocked, ratio } = loc.revenue;
  const salesReached = unlocked === true;
  const revenueLocked = threshold !== null && unlocked === false;
  const pctOfTarget = threshold !== null && ratio !== null ? Math.round(ratio * 100) : null;
  // Simplified palette: green = reached, dark grey = still in progress. No red, no bronze.
  const barColor = salesReached ? "#15803d" : "#374151";
  const barWidth = pctOfTarget !== null ? Math.min(100, pctOfTarget) : 0;
  const salesStatus = salesTargetLabel(!!unlocked, ratio, month, amount, threshold);
  const metrics = buildTeamMetrics(loc, month);

  const merchTier = loc.merchandising.tier;
  const merchPass = merchTier > 0 ? true : loc.merchandising.ratio !== null ? false : null;
  const merchBonus = MERCH_BONUS_BY_TIER[merchTier] ?? 0;

  // Per-challenge state: "earned" = target hit AND payable (sales reached, or merch which never needs sales).
  // "waiting" = target hit BUT sales target missed → would have been paid otherwise.
  const states: { passes: boolean | null; locked: boolean; earned: number; waiting: number; max: number }[] = [
    { passes: merchPass, locked: false, earned: merchBonus, waiting: 0, max: 5000 },
    { passes: loc.snacks.passes, locked: revenueLocked, earned: loc.snacks.bonus, waiting: loc.snacks.passes === true && revenueLocked ? SNACKS_BONUS : 0, max: SNACKS_BONUS },
    { passes: loc.panierMoyen.passes, locked: revenueLocked, earned: loc.panierMoyen.bonus, waiting: loc.panierMoyen.passes === true && revenueLocked ? PANIER_BONUS : 0, max: PANIER_BONUS },
    { passes: loc.opex.passes, locked: revenueLocked, earned: loc.opex.bonus, waiting: loc.opex.passes === true && revenueLocked ? OPEX_BONUS : 0, max: OPEX_BONUS },
    { passes: loc.reviews.volumePass, locked: revenueLocked, earned: loc.reviews.volumeBonus, waiting: loc.reviews.volumePass === true && revenueLocked ? REVIEWS_VOLUME_BONUS : 0, max: REVIEWS_VOLUME_BONUS },
    { passes: loc.reviews.ratingPass, locked: revenueLocked, earned: loc.reviews.ratingBonus, waiting: loc.reviews.ratingPass === true && revenueLocked ? REVIEWS_RATING_BONUS : 0, max: REVIEWS_RATING_BONUS },
  ];

  function rowStatus(s: (typeof states)[number]): TeamRowStatus {
    if (s.passes === null) return "nodata";
    if (s.passes === true) return s.locked ? "waiting" : "earned";
    return "missed";
  }

  const earnedCount = states.filter((s) => rowStatus(s) === "earned").length;
  const waitingCount = states.filter((s) => rowStatus(s) === "waiting").length;
  const waitingBonus = states.reduce((sum, s) => sum + s.waiting, 0);

  const visitorLine =
    loc.entryCount !== null || loc.snacksSold !== null
      ? `<div class="kpi-sub">${loc.entryCount !== null ? `${fmt(loc.entryCount, 0)} visitors` : ""}${loc.entryCount !== null && loc.snacksSold !== null ? " · " : ""}${loc.snacksSold !== null ? `${fmt(loc.snacksSold, 0)} animal food` : ""}</div>`
      : "";

  const tableRows = metrics
    .map((m, i) => {
      const s = states[i];
      const status = rowStatus(s);
      const bonusHtml =
        status === "earned"
          ? `<span class="bonus-earned">฿${fmt(s.earned, 0)}</span>`
          : status === "waiting"
            ? `<span class="bonus-waiting">฿${fmt(s.waiting, 0)} to unlock</span>`
            : `<span class="bonus-max">up to ฿${fmt(s.max, 0)}</span>`;
      // Plain-language progress line under the numbers: what is missing, or confirmation.
      const progressLine =
        status === "earned"
          ? "Target hit — bonus paid."
          : status === "waiting"
            ? "Target hit — paid once sales target is reached."
            : status === "missed"
              ? escHtml(m.gapSecondary ?? m.gapPrimary)
              : "Waiting for data.";
      return `<tr>
        <td><div class="metric-name">${m.letter}. ${escHtml(m.label)}</div><div class="metric-sub">${escHtml(m.subtitle)}</div></td>
        <td class="num">${escHtml(m.current)}</td>
        <td class="target">${escHtml(m.target)}<div class="metric-sub">${escHtml(progressLine)}</div></td>
        <td class="status-cell">${teamStatusPill(status)}</td>
        <td class="bonus-cell">${bonusHtml}</td>
      </tr>`;
    })
    .join("");

  const adviceCards = metrics
    .map((m, i) => {
      const status = rowStatus(states[i]);
      // Focus advice on what is not earned yet; earned cards get a short confirmation.
      const tip = status === "earned" ? m.achievedTip : m.adviceTip;
      const gapCls = status === "earned" ? "pill-earned" : status === "waiting" ? "pill-waiting" : "pill-missed";
      const gapText = status === "earned" ? "Earned ✓" : escHtml(m.gapPrimary);
      return `<div class="advice-card">
        <div class="title">${m.letter}. ${escHtml(m.label)}</div>
        <div><span class="gap pill ${gapCls}">${gapText}</span></div>
        <div class="tip">${escHtml(tip)}</div>
      </div>`;
    })
    .join("");

  return `<div class="dashboard">
    <div class="dash-header">
      <div><div class="dash-title">${name}</div><div class="dash-subtitle">Monthly Challenge — your bonus, simply explained</div></div>
      <div class="dash-logo">Capybara Coffee</div>
    </div>

    <div class="how">
      <strong>How your bonus works:</strong> each challenge has a target. Hit it and the bonus is
      <span class="dot dot-earned">Earned ✓</span> — with one rule: apart from Merchandise, bonuses are only paid if the shop also reaches its <strong>monthly sales target</strong>.
      <span class="dot dot-waiting">Waiting for sales</span> means you hit the target but sales were missed, so it is not paid.
      <span class="dot dot-missed">Not yet</span> means the target was not hit yet.
    </div>

    <div class="kpi-row">
      <div class="kpi-card sales">
        <div class="kpi-label">1 · Monthly sales — the key target</div>
        <div class="kpi-value">${amount !== null ? `฿${fmt(amount, 0)}` : "—"}${threshold !== null ? `<span class="kpi-target"> / ฿${fmt(threshold, 0)}</span>` : ""}${pctOfTarget !== null ? ` <span class="kpi-target">${pctOfTarget}%</span>` : ""}</div>
        <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${barWidth}%;background:${barColor}"></div></div>
        <div class="sales-status ${salesStatus.cls}">${escHtml(salesStatus.label)}</div>
        ${visitorLine}
      </div>
      <div class="kpi-card earned">
        <div class="kpi-label">2 · Bonus earned</div>
        <div class="kpi-value small">฿${fmt(loc.totalBonus, 0)}</div>
        <div class="kpi-sub">${earnedCount} of 6 challenges earned and paid.</div>
      </div>
      <div class="kpi-card waiting">
        <div class="kpi-label">3 · Would have been extra</div>
        <div class="kpi-value small">฿${fmt(waitingBonus, 0)}</div>
        <div class="kpi-sub">${waitingCount === 0 ? "Nothing waiting — every hit target is paid." : `${waitingCount} challenge${waitingCount === 1 ? "" : "s"} hit, but not paid because sales were missed.`}</div>
      </div>
    </div>

    <div class="section-title">Your challenges — earned or still to unlock?</div>
    <div class="section-hint">“Earned” = target hit and paid. “Waiting for sales” = target hit but not paid because monthly sales were missed. “Not yet” = target not hit.</div>
    <table class="metric-table">
      <thead><tr><th>Challenge</th><th>Result</th><th>Target</th><th>Status</th><th>Bonus</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>

    <div class="section-title">What to focus on next</div>
    <div class="advice-row">${adviceCards}</div>
    <div class="footer">Small actions every day lead to big results. Let&apos;s keep growing together!</div>
  </div>`;
}

function buildTeamPrintHtml(locations: LocationOverview[], month: string): string {
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
  const generated = new Date().toLocaleDateString("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const title = `Monthly Challenge — ${monthLabel}`;
  const dashboards = locations.map((loc) => buildTeamDashboardBlock(loc, month)).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${TEAM_PRINT_CSS}</style></head><body>
<div class="page">
  <div class="cover">
    <div><div class="cover-title">${escHtml(title)}</div><div class="cover-sub">${locations.length} shop${locations.length === 1 ? "" : "s"} · Green = bonus paid · Yellow = target hit but not paid (sales missed)</div></div>
    <div class="cover-meta">Capybara Coffee<br>Generated ${escHtml(generated)}</div>
  </div>
  ${dashboards}
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
}

export function buildOverviewPrintHtml(
  locations: LocationOverview[],
  month: string,
  opts?: { summaryOnly?: boolean; teamMode?: boolean },
): string {
  const teamMode = opts?.teamMode ?? false;

  if (teamMode && !opts?.summaryOnly) {
    return buildTeamPrintHtml(locations, month);
  }

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
  const totalEarned = locations.reduce((s, l) => s + l.totalBonus, 0);
  const generated = new Date().toLocaleDateString("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const titlePrefix = teamMode ? "Team challenges" : "Challenges";
  const summaryOnly = opts?.summaryOnly ?? false;
  const title = summaryOnly
    ? `${titlePrefix} — ${monthLabel} — Summary`
    : teamMode
      ? `${titlePrefix} — ${monthLabel} — All shops`
      : `Operations — ${monthLabel}`;

  const labels = teamMode ? TEAM_CHALLENGE_LABELS : CHALLENGE_LABELS;
  const summaryHeaders = [
    "Shop",
    labels.salesTarget,
    "Total bonus",
    labels.productsPct,
    labels.snacks,
    labels.spendPerVisit,
    labels.runningCostsPct,
    labels.reviewCount,
    labels.reviewRating,
  ]
    .map((h) => `<th>${escHtml(h)}</th>`)
    .join("");

  const locationBlocks = summaryOnly
    ? ""
    : locations.map((loc) => buildLocationBlock(loc, teamMode)).join("");

  const headerTag = teamMode ? "Team — Performance" : "Internal — Performance";
  const summaryTableCls = summaryOnly ? "" : ' class="summary-table"';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${PRINT_CSS}</style></head><body>
<div class="accent"></div>
<div class="header">
  <div class="header-left">
    <h1>${escHtml(title)}</h1>
    <div class="meta">Total earned: ${totalEarned.toLocaleString()} ฿ across ${locations.length} shop${locations.length === 1 ? "" : "s"}</div>
  </div>
  <div class="header-right">Capybara Coffee<br>Generated ${escHtml(generated)}<br>${escHtml(headerTag)}</div>
</div>
<div class="content">
  <table${summaryTableCls}>
    <thead><tr>${summaryHeaders}</tr></thead>
    <tbody>${buildSummaryRows(locations, teamMode)}</tbody>
  </table>
  ${locationBlocks}
  <div class="legend">${buildLegend(teamMode)}</div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
}
