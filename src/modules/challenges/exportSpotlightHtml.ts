import { SPOTLIGHT_LABELS } from "@/modules/challenges/labels";
import type { RecognitionVisual, SpotlightResponse } from "@/modules/challenges/spotlight";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PRINT_CSS = [
  "*{box-sizing:border-box;margin:0;padding:0}",
  "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:10px;color:#2b231b;background:#f8f6f3}",
  ".page{padding:14px 18px;max-width:900px;margin:0 auto}",
  ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(43,35,27,0.12)}",
  "h1{font-size:20px;font-weight:600;font-style:italic;color:#2b231b}",
  ".meta{font-size:9px;color:#8a7d6a;margin-top:2px}",
  ".brand{font-size:8px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b5d4b;text-align:right;line-height:1.5}",
  ".banner{border:1px solid rgba(43,35,27,0.1);border-radius:8px;background:#fff;margin-bottom:14px;overflow:hidden;page-break-inside:avoid}",
  ".banner-head{padding:14px 16px;background:linear-gradient(90deg,rgba(230,212,186,0.5),#fff)}",
  ".eyebrow{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9a7448}",
  ".shop-name{font-size:22px;font-weight:500;font-style:italic;margin-top:2px}",
  ".shop-sub{font-size:9px;color:#8a7d6a;margin-top:2px}",
  ".score-row{display:flex;align-items:center;gap:12px;margin-top:10px}",
  ".score-ring{width:52px;height:52px;border-radius:50%;border:4px solid #16a34a;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff}",
  ".score-num{font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}",
  ".score-den{font-size:7px;color:#8a7d6a}",
  ".stats{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
  ".stat-pill{display:inline-flex;gap:6px;align-items:center;border:1px solid rgba(22,163,74,0.2);background:rgba(220,252,231,0.5);border-radius:999px;padding:3px 8px;font-size:8px}",
  ".stat-pill strong{font-variant-numeric:tabular-nums;color:#16a34a}",
  ".section{padding:12px 16px;border-top:1px solid rgba(43,35,27,0.08)}",
  ".section-title{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8a7d6a;margin-bottom:8px}",
  ".metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}",
  ".metric{display:flex;overflow:hidden;border:1px solid rgba(43,35,27,0.1);border-radius:6px;background:#fff}",
  ".metric-bar{width:3px;flex-shrink:0}",
  ".metric-body{display:flex;align-items:center;gap:8px;padding:6px 8px;flex:1;min-width:0}",
  ".metric-icon{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;flex-shrink:0}",
  ".metric-label{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8a7d6a}",
  ".metric-value{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}",
  ".metric-hint{font-size:7px;font-weight:500;color:#8a7d6a;margin-left:3px}",
  ".metric-target-row{font-size:8px;font-weight:600;color:#4a3f33;margin-top:2px}",
  ".metric-badge{font-size:7px;font-weight:700;text-transform:uppercase;margin-left:auto;text-align:right}",
  ".metric-badge.pass{color:#16a34a}.metric-badge.miss{color:#d97706}.metric-badge.pending{color:#8a7d6a}",
  ".visual-ring{display:flex;align-items:center;gap:8px}",
  ".visual-ring-num{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}",
  ".visual-ring-detail{font-size:9px;font-weight:600;font-variant-numeric:tabular-nums;color:#4a3f33;margin-top:3px}",
  ".visual-tiers{display:flex;gap:3px;margin-bottom:4px}",
  ".visual-tier{height:4px;flex:1;border-radius:999px;background:#f2f0ec}",
  ".visual-tier.on{background:#9a7448}",
  ".visual-dual{display:grid;grid-template-columns:1fr 1fr;gap:4px}",
  ".visual-stat{border:1px solid rgba(43,35,27,0.1);border-radius:4px;padding:4px 6px;text-align:center;background:#f8f7f4}",
  ".visual-stat-label{font-size:6px;font-weight:700;text-transform:uppercase;color:#8a7d6a}",
  ".visual-stat-val{font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:2px}",
  ".visual-hero{text-align:center;padding:4px 0}",
  ".visual-hero-val{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums}",
  ".visual-delta{font-size:16px;font-weight:700;color:#2563eb}",
  ".tips{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}",
  ".tip{border:1px solid rgba(43,35,27,0.1);border-radius:6px;padding:8px;background:#fff;font-size:9px;line-height:1.4;color:#4a3f33}",
  ".shoutouts{margin-top:14px;page-break-inside:avoid}",
  ".shoutout-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}",
  ".card{border:1px solid rgba(43,35,27,0.1);border-radius:8px;background:#fff;overflow:hidden}",
  ".card-accent{height:3px}",
  ".card-body{padding:10px 12px}",
  ".card-kind{font-size:9px;font-weight:600}",
  ".card-hint{font-size:7px;color:#8a7d6a;margin-top:1px}",
  ".card-shop{font-size:10px;font-weight:600;margin-top:8px}",
  ".card-value{font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:2px}",
  ".card-sub{font-size:8px;color:#8a7d6a;margin-top:2px}",
  ".card-also{font-size:7px;color:#8a7d6a;margin-top:4px}",
  ".notice{border:1px solid rgba(217,119,6,0.25);background:rgba(254,243,199,0.4);border-radius:6px;padding:8px 10px;margin-bottom:12px;font-size:9px}",
  ".footer{text-align:center;font-size:8px;font-style:italic;color:#8a7d6a;margin-top:14px;padding-top:8px;border-top:1px solid rgba(43,35,27,0.08)}",
  ".muted{color:#8a7d6a}",
  "@media print{@page{margin:10mm;size:portrait}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
].join("");

const ACCENT_COLORS: Record<string, string> = {
  revenue: "#9a7448",
  merch: "#6b5d4b",
  snacks: "#d97706",
  reviews: "#b45309",
  spend: "#78716c",
  completion: "#16a34a",
  improved: "#2563eb",
};

function buildFeaturedSection(data: SpotlightResponse): string {
  const { featured } = data;
  if (!featured.available) {
    return `<div class="banner"><div class="banner-head"><p class="muted">${escHtml(SPOTLIGHT_LABELS.insufficientData)}</p></div></div>`;
  }

  const score = featured.executionScore ?? 0;
  const total = featured.executionTotal ?? 6;

  const statsHtml = (featured.summaryStats ?? [])
    .map(
      (s) =>
        `<span class="stat-pill"><span>${escHtml(s.label)}</span> <strong>${escHtml(s.value)}</strong></span>`,
    )
    .join("");

  const metricsHtml = (featured.metricBreakdown ?? [])
    .map((m) => {
      const accent = metricAccent(m.passes);
      const badge =
        m.passes === true
          ? SPOTLIGHT_LABELS.statusPass
          : m.passes === false
            ? SPOTLIGHT_LABELS.statusMiss
            : SPOTLIGHT_LABELS.statusPending;
      const badgeClass =
        m.passes === true ? "pass" : m.passes === false ? "miss" : "pending";
      return `<div class="metric">
        <div class="metric-bar" style="background:${accent}"></div>
        <div class="metric-body">
          <div style="min-width:0;flex:1">
            <div class="metric-label">${escHtml(m.label)}</div>
            <div class="metric-value">${escHtml(m.value)}${m.valueHint ? `<span class="metric-hint">${escHtml(m.valueHint)}</span>` : ""}</div>
            <div class="metric-target-row">${escHtml(m.target)}</div>
          </div>
          <div class="metric-badge ${badgeClass}">${escHtml(badge)}</div>
        </div>
      </div>`;
    })
    .join("");

  const tipsHtml = (featured.tips ?? [])
    .map((tip) => `<div class="tip">${escHtml(tip)}</div>`)
    .join("");

  return `<article class="banner">
    <div class="banner-head">
      <div class="eyebrow">${escHtml(SPOTLIGHT_LABELS.shopSpotlight)}</div>
      <div class="shop-name">${escHtml(featured.locationTitle ?? "")}</div>
      <div class="shop-sub">${escHtml(SPOTLIGHT_LABELS.shopSpotlightSubtitle)}</div>
      <div class="score-row">
        <div class="score-ring">
          <div class="score-num">${score}</div>
          <div class="score-den">/${total}</div>
        </div>
        <div>
          <div class="section-title">${escHtml(SPOTLIGHT_LABELS.scoreLabel)}</div>
          <div>${score} ${escHtml(SPOTLIGHT_LABELS.targetsMet)}</div>
        </div>
      </div>
      ${statsHtml ? `<div class="stats">${statsHtml}</div>` : ""}
    </div>
    ${metricsHtml ? `<div class="section"><div class="section-title">${escHtml(SPOTLIGHT_LABELS.metricGridTitle)}</div><div class="metric-grid">${metricsHtml}</div></div>` : ""}
    ${tipsHtml ? `<div class="section"><div class="section-title">${escHtml(SPOTLIGHT_LABELS.tipsTitle)}</div><div class="tips">${tipsHtml}</div></div>` : ""}
  </article>`;
}

function metricAccent(passes: boolean | null): string {
  if (passes === true) return "#16a34a";
  if (passes === false) return "#d97706";
  return "#8a7d6a";
}

function renderRecognitionVisual(visual: RecognitionVisual): string {
  switch (visual.type) {
    case "ring":
      return `<div class="visual-ring"><div class="visual-ring-num">${escHtml(visual.primary)}</div><div class="card-sub">${escHtml(visual.secondary)}</div></div>${visual.detail ? `<div class="visual-ring-detail">${escHtml(visual.detail)}</div>` : ""}`;
    case "tiers": {
      const bars = Array.from({ length: visual.maxTier })
        .map((_, i) => `<div class="visual-tier${i < visual.tier ? " on" : ""}"></div>`)
        .join("");
      return `<div class="visual-tiers">${bars}</div>
        <div class="card-value">${escHtml(visual.pctLabel)}</div>
        ${visual.tier > 0 ? `<div class="card-sub">Tier ${visual.tier} reached</div>` : ""}
        ${visual.nextLabel ? `<div class="card-sub">${escHtml(visual.nextLabel)}</div>` : ""}`;
    }
    case "dual":
      return `<div class="visual-dual">
        ${[visual.left, visual.right]
          .map(
            (s) =>
              `<div class="visual-stat"><div class="visual-stat-label">${escHtml(s.label)}</div><div class="visual-stat-val">${escHtml(s.value)}</div></div>`,
          )
          .join("")}
      </div>`;
    case "hero":
      return `<div class="visual-hero"><div class="visual-hero-val">${escHtml(visual.value)}</div>${visual.unit ? `<div class="card-sub">${escHtml(visual.unit)}</div>` : ""}</div>`;
    case "delta":
      return `<div><span class="visual-delta">${escHtml(visual.delta)}</span> <span class="card-sub">${visual.from} → ${visual.to} of ${visual.total} targets</span></div>`;
  }
}

function buildShoutoutsSection(data: SpotlightResponse): string {
  const cards = data.recognitions
    .map((r) => {
      const accent = ACCENT_COLORS[r.kind] ?? "#8a7d6a";
      const label = SPOTLIGHT_LABELS.recognitions[r.kind];
      const hint = SPOTLIGHT_LABELS.recognitionHints[r.kind];
      const unavailableReason =
        r.unavailableReason === "noPriorMonth"
          ? SPOTLIGHT_LABELS.noPriorMonth
          : r.unavailableReason === "dataPending"
            ? SPOTLIGHT_LABELS.dataPending
            : "";

      const body = r.unavailable
        ? `<div class="card-value muted">—</div>${unavailableReason ? `<div class="card-sub">${escHtml(unavailableReason)}</div>` : ""}`
        : `<div class="card-shop" style="color:${accent}">${escHtml(r.locationTitle)}</div>
           ${r.visual ? renderRecognitionVisual(r.visual) : `<div class="card-value">${escHtml(r.value)}</div>`}
           ${r.sub ? `<div class="card-sub">${escHtml(r.sub)}</div>` : ""}
           ${r.alsoStrong?.length ? `<div class="card-also">${escHtml(SPOTLIGHT_LABELS.alsoStrong)}: ${escHtml(r.alsoStrong.join(", "))}</div>` : ""}`;

      return `<div class="card">
        <div class="card-accent" style="background:${accent}"></div>
        <div class="card-body">
          <div class="card-kind">${escHtml(label)}</div>
          <div class="card-hint">${escHtml(hint)}</div>
          ${body}
        </div>
      </div>`;
    })
    .join("");

  return `<section class="shoutouts">
    <div class="section-title">${escHtml(SPOTLIGHT_LABELS.metricRecognition)}</div>
    <p class="meta" style="margin-bottom:8px">${escHtml(SPOTLIGHT_LABELS.metricRecognitionSubtitle)}</p>
    <div class="shoutout-grid">${cards}</div>
  </section>`;
}

export function buildSpotlightPrintHtml(data: SpotlightResponse): string {
  const monthLabel = new Date(`${data.month}-01T00:00:00`).toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });
  const generated = new Date().toLocaleDateString("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const title = `Shop Spotlight — ${monthLabel}`;

  const notice = data.monthInProgress
    ? `<div class="notice">${escHtml(SPOTLIGHT_LABELS.monthInProgress)}</div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${PRINT_CSS}</style></head><body>
<div class="page">
  <div class="header">
    <div>
      <h1>${escHtml(title)}</h1>
      <div class="meta">Monthly highlights and shout-outs</div>
    </div>
    <div class="brand">Capybara Coffee<br>Generated ${escHtml(generated)}</div>
  </div>
  ${notice}
  ${buildFeaturedSection(data)}
  ${buildShoutoutsSection(data)}
  <div class="footer">${escHtml(SPOTLIGHT_LABELS.footerNote)}</div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
}
