import type { LocationOverview } from "@/app/api/challenges/overview/route";
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
  const gap = ctx.gap ? `<br><span class="warn">${escHtml(ctx.gap)}</span>` : "";
  return `<strong>${escHtml(ctx.headline)}</strong><br><span class="muted">${escHtml(ctx.detail)}</span>${gap}`;
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
  meaning?: string;
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
      value: teamMode ? merchCtx.headline : pct(loc.merchandising.ratio),
      target: merchTarget,
      meaning: teamMode ? [merchCtx.detail, merchCtx.gap].filter(Boolean).join(" · ") : undefined,
      passes: merchPasses,
      bonus: loc.merchandising.bonus,
      locked: false,
      potentialBonus: 0,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.snacks : CHALLENGE_LABELS.snacks,
      value: teamMode ? snacksCtx.headline : loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—",
      target: teamMode ? snacksCtx.detail : "≥ 0.45",
      meaning: teamMode ? snacksCtx.gap : undefined,
      passes: loc.snacks.passes,
      bonus: loc.snacks.bonus,
      locked: revenueLocked,
      potentialBonus: SNACKS_BONUS,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.spendPerVisit : CHALLENGE_LABELS.spendPerVisit,
      value: teamMode ? panierCtx.headline : loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—",
      target: teamMode ? panierCtx.detail : "≥ 190 ฿",
      meaning: teamMode ? panierCtx.gap : undefined,
      passes: loc.panierMoyen.passes,
      bonus: loc.panierMoyen.bonus,
      locked: revenueLocked,
      potentialBonus: PANIER_BONUS,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.runningCostsPct : CHALLENGE_LABELS.runningCostsPct,
      value: teamMode ? opexCtx.headline : pct(loc.opex.ratio),
      target: teamMode ? opexCtx.detail : "< 9.5%",
      meaning: teamMode ? opexCtx.gap : undefined,
      passes: loc.opex.passes,
      bonus: loc.opex.bonus,
      locked: revenueLocked,
      potentialBonus: OPEX_BONUS,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.reviewCount : CHALLENGE_LABELS.reviewCount,
      value: teamMode ? reviewVolCtx.headline : loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`,
      target: teamMode ? reviewVolCtx.detail : "≥ 4%",
      meaning: teamMode ? reviewVolCtx.gap : undefined,
      passes: loc.reviews.volumePass,
      bonus: loc.reviews.volumeBonus,
      locked: revenueLocked,
      potentialBonus: REVIEWS_VOLUME_BONUS,
    },
    {
      label: teamMode ? TEAM_CHALLENGE_LABELS.reviewRating : CHALLENGE_LABELS.reviewRating,
      value: teamMode ? reviewRatingCtx.headline : loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : "—",
      target: teamMode
        ? reviewRatingCtx.detail
        : loc.reviews.currentRating > 0 && loc.reviews.ratingTarget > 0
          ? `≥ ${loc.reviews.ratingTarget.toFixed(1)}`
          : "—",
      meaning: teamMode ? reviewRatingCtx.gap : undefined,
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

  const targetHeader = teamMode ? "What this means" : "Target";
  const metricHeader = teamMode ? "Challenge" : "Metric";
  const valueHeader = teamMode ? "Progress" : "Value";

  const metricRows = buildMetricDetails(loc, teamMode)
    .map((m) => {
      const bonusHtml = bonusCell(m.passes, m.bonus, m.locked, m.potentialBonus, teamMode);
      const meaningCell = teamMode
        ? escHtml([m.target, m.meaning].filter(Boolean).join(" · "))
        : escHtml(m.target);
      return `<tr>
        <td>${escHtml(m.label)}</td>
        <td class="num">${escHtml(m.value)}</td>
        <td class="muted">${meaningCell}</td>
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
      <thead><tr><th>Period</th><th>Visitors</th><th>Snacks sold</th></tr></thead>
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
  ".location-block{margin-top:16px;page-break-inside:avoid}",
  ".detail-table{margin-bottom:4px}",
  ".legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb}",
  ".legend-item{display:flex;flex-direction:column;gap:1px;border:1px solid #e5e7eb;border-radius:4px;padding:6px 10px;min-width:120px}",
  ".legend-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280}",
  ".legend-max{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums}",
  ".legend-tiers{font-size:9px;color:#9ca3af}",
  "@media print{@page{margin:8mm;size:landscape}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
].join("");

export function buildOverviewPrintHtml(
  locations: LocationOverview[],
  month: string,
  opts?: { summaryOnly?: boolean; teamMode?: boolean },
): string {
  const teamMode = opts?.teamMode ?? false;
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
  const title = opts?.summaryOnly
    ? `${titlePrefix} — ${monthLabel} — Summary`
    : `${titlePrefix} — ${monthLabel} — All shops`;

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

  const locationBlocks = opts?.summaryOnly
    ? ""
    : locations.map((loc) => buildLocationBlock(loc, teamMode)).join("");

  const headerTag = teamMode ? "Team — Performance" : "Internal — Performance";

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
  <table>
    <thead><tr>${summaryHeaders}</tr></thead>
    <tbody>${buildSummaryRows(locations, teamMode)}</tbody>
  </table>
  ${locationBlocks}
  <div class="legend">${buildLegend(teamMode)}</div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
}
