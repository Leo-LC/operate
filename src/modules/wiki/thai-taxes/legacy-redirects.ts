/**
 * Old hand-written article pages used short slugs (one per tax family). The rework
 * splits each of those into several dedicated articles, so any existing link to the
 * old short slug is redirected to the canonical replacement instead of 404ing.
 */
export const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  vat: "vat-pp30",
  wht: "wht-overview",
  cit: "cit-overview",
  payroll: "payroll-overview",
  dividends: "dividends-overview",
  declarations: "fiscal-calendar",
};
