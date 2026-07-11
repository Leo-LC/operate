import type { LocationOverview } from "@/app/api/challenges/overview/route";
import { CHALLENGE_LABELS, LEGEND_ITEMS, PERIOD_LABELS } from "./labels";

const SNACKS_BONUS = 1250;
const PANIER_BONUS = 1250;
const OPEX_BONUS = 1250;
const REVIEWS_VOLUME_BONUS = 625;
const REVIEWS_RATING_BONUS = 625;

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
): string {
  if (passes === true && locked) {
    return `<span class="locked">Locked ${potentialBonus.toLocaleString()} ฿</span>`;
  }
  if (passes === true && bonus > 0) {
    return `<span class="pass">${bonus.toLocaleString()} ฿</span>`;
  }
  return "";
}

function metricSummaryCell(
  passes: boolean | null,
  value: string,
  bonus: number,
  locked: boolean,
  potentialBonus: number,
): string {
  const status = statusSymbol(passes);
  const bonusText = bonusCell(passes, bonus, locked, potentialBonus);
  return `${status} ${escHtml(value)}${bonusText ? `<br>${bonusText}` : ""}`;
}

function salesTargetCell(loc: LocationOverview): string {
  const { amount, threshold, unlocked } = loc.revenue;
  if (threshold === null) return '<span class="muted">—</span>';
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

function buildSummaryRows(locations: LocationOverview[]): string {
  return locations
    .map((loc, idx) => {
      const revenueLocked = loc.revenue.threshold !== null && loc.revenue.unlocked === false;
      const merchPasses = loc.merchandising.tier > 0 ? true : loc.merchandising.ratio !== null ? false : null;
      const rowCls = idx % 2 === 1 ? ' class="alt"' : "";

      return `<tr${rowCls}>
        <td class="shop">${escHtml(shortName(loc.locationTitle))}</td>
        <td>${salesTargetCell(loc)}</td>
        <td class="bonus-total">${loc.totalBonus > 0 ? `<span class="pass">${loc.totalBonus.toLocaleString()} ฿</span>` : '<span class="muted">0 ฿</span>'}</td>
        <td>${metricSummaryCell(merchPasses, pct(loc.merchandising.ratio), loc.merchandising.bonus, false, 0)}</td>
        <td>${metricSummaryCell(loc.snacks.passes, loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—", loc.snacks.bonus, revenueLocked, SNACKS_BONUS)}</td>
        <td>${metricSummaryCell(loc.panierMoyen.passes, loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—", loc.panierMoyen.bonus, revenueLocked, PANIER_BONUS)}</td>
        <td>${metricSummaryCell(loc.opex.passes, pct(loc.opex.ratio), loc.opex.bonus, revenueLocked, OPEX_BONUS)}</td>
        <td>${metricSummaryCell(loc.reviews.volumePass, loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`, loc.reviews.volumeBonus, revenueLocked, REVIEWS_VOLUME_BONUS)}</td>
        <td>${metricSummaryCell(loc.reviews.ratingPass, loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : "—", loc.reviews.ratingBonus, revenueLocked, REVIEWS_RATING_BONUS)}</td>
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

function buildMetricDetails(loc: LocationOverview): MetricDetail[] {
  const revenueLocked = loc.revenue.threshold !== null && loc.revenue.unlocked === false;
  const merchPasses = loc.merchandising.tier > 0 ? true : loc.merchandising.ratio !== null ? false : null;
  const merchTarget = loc.merchandising.tier > 0 ? MERCH_TIER_LABELS[loc.merchandising.tier] : "≥ 7%";

  return [
    {
      label: CHALLENGE_LABELS.productsPct,
      value: pct(loc.merchandising.ratio),
      target: merchTarget,
      passes: merchPasses,
      bonus: loc.merchandising.bonus,
      locked: false,
      potentialBonus: 0,
    },
    {
      label: CHALLENGE_LABELS.snacks,
      value: loc.snacks.ratio !== null ? loc.snacks.ratio.toFixed(2) : "—",
      target: "≥ 0.45",
      passes: loc.snacks.passes,
      bonus: loc.snacks.bonus,
      locked: revenueLocked,
      potentialBonus: SNACKS_BONUS,
    },
    {
      label: CHALLENGE_LABELS.spendPerVisit,
      value: loc.panierMoyen.value !== null ? `${fmt(loc.panierMoyen.value, 0)} ฿` : "—",
      target: "≥ 190 ฿",
      passes: loc.panierMoyen.passes,
      bonus: loc.panierMoyen.bonus,
      locked: revenueLocked,
      potentialBonus: PANIER_BONUS,
    },
    {
      label: CHALLENGE_LABELS.runningCostsPct,
      value: pct(loc.opex.ratio),
      target: "< 9.5%",
      passes: loc.opex.passes,
      bonus: loc.opex.bonus,
      locked: revenueLocked,
      potentialBonus: OPEX_BONUS,
    },
    {
      label: CHALLENGE_LABELS.reviewCount,
      value: loc.reviews.volumeRatio !== null ? pct(loc.reviews.volumeRatio) : `${loc.reviews.count} reviews`,
      target: "≥ 4%",
      passes: loc.reviews.volumePass,
      bonus: loc.reviews.volumeBonus,
      locked: revenueLocked,
      potentialBonus: REVIEWS_VOLUME_BONUS,
    },
    {
      label: CHALLENGE_LABELS.reviewRating,
      value: loc.reviews.count > 0 ? loc.reviews.avgRating.toFixed(1) : "—",
      target:
        loc.reviews.currentRating > 0 && loc.reviews.ratingTarget > 0
          ? `≥ ${loc.reviews.ratingTarget.toFixed(1)}`
          : "—",
      passes: loc.reviews.ratingPass,
      bonus: loc.reviews.ratingBonus,
      locked: revenueLocked,
      potentialBonus: REVIEWS_RATING_BONUS,
    },
  ];
}

function buildLocationBlock(loc: LocationOverview): string {
  const { amount, threshold, unlocked } = loc.revenue;
  const name = escHtml(shortName(loc.locationTitle));
  const totalBonusCls = loc.totalBonus > 0 ? "pass" : "muted";

  let gateHtml = "";
  if (threshold !== null) {
    const gateCls = unlocked === true ? "gate-unlocked" : "gate-locked";
    const gateLabel =
      unlocked === true ? CHALLENGE_LABELS.salesTargetReached : CHALLENGE_LABELS.salesTarget;
    const amountStr = amount !== null ? fmt(amount, 0) : "—";
    gateHtml = `<div class="${gateCls}">
      <strong>${escHtml(gateLabel)}</strong> — ${amountStr} / ${fmt(threshold, 0)} ฿
    </div>`;
  }

  const metricRows = buildMetricDetails(loc)
    .map((m) => {
      const bonusHtml = bonusCell(m.passes, m.bonus, m.locked, m.potentialBonus);
      return `<tr>
        <td>${escHtml(m.label)}</td>
        <td class="num">${escHtml(m.value)}</td>
        <td class="num muted">${escHtml(m.target)}</td>
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

  return `<div class="location-block">
    <h2>${name} — <span class="${totalBonusCls}">${loc.totalBonus.toLocaleString()} ฿</span></h2>
    ${gateHtml}
    <table class="detail-table">
      <thead><tr><th>Metric</th><th>Value</th><th>Target</th><th>Status</th><th>Bonus</th></tr></thead>
      <tbody>${metricRows}</tbody>
    </table>
    <h3>${escHtml(CHALLENGE_LABELS.visitorCounts)}</h3>
    <table class="detail-table">
      <thead><tr><th>Period</th><th>Visitors</th><th>Snacks sold</th></tr></thead>
      <tbody>${periodRows}</tbody>
    </table>
  </div>`;
}

function buildLegend(): string {
  return LEGEND_ITEMS.map(
    (item) =>
      `<div class="legend-item">
        <span class="legend-label">${escHtml(item.label)}</span>
        <span class="legend-max">${escHtml(item.max)}</span>
        <span class="legend-tiers">${escHtml(item.tiers)}</span>
      </div>`,
  ).join("");
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

export function buildOverviewPrintHtml(locations: LocationOverview[], month: string): string {
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
  const title = `Challenges — ${monthLabel} — All shops`;

  const summaryHeaders = [
    "Shop",
    CHALLENGE_LABELS.salesTarget,
    "Total bonus",
    CHALLENGE_LABELS.productsPct,
    CHALLENGE_LABELS.snacks,
    CHALLENGE_LABELS.spendPerVisit,
    CHALLENGE_LABELS.runningCostsPct,
    CHALLENGE_LABELS.reviewCount,
    CHALLENGE_LABELS.reviewRating,
  ]
    .map((h) => `<th>${escHtml(h)}</th>`)
    .join("");

  const locationBlocks = locations.map(buildLocationBlock).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${PRINT_CSS}</style></head><body>
<div class="accent"></div>
<div class="header">
  <div class="header-left">
    <h1>${escHtml(title)}</h1>
    <div class="meta">Total earned: ${totalEarned.toLocaleString()} ฿ across ${locations.length} shop${locations.length === 1 ? "" : "s"}</div>
  </div>
  <div class="header-right">Capybara Coffee<br>Generated ${escHtml(generated)}<br>Internal — Performance</div>
</div>
<div class="content">
  <table>
    <thead><tr>${summaryHeaders}</tr></thead>
    <tbody>${buildSummaryRows(locations)}</tbody>
  </table>
  ${locationBlocks}
  <div class="legend">${buildLegend()}</div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
}
