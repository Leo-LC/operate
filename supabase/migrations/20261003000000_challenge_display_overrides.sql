-- Challenge display overrides — end-of-month print adjustments.
--
-- Pure PRESENTATION layer: stores per-shop, per-month, per-metric display values
-- shown on challenge cards and printed/exported PDFs INSTEAD of the computed
-- real values. Never touches the sources of truth:
--   - Loyverse snapshots (loyverse_daily_snapshots)
--   - accounting (daily_entries)
--   - counters (challenge_counters)
--   - reviews (reviews_cache / location_gbp_ratings)
-- Revert = DELETE the row → the real computed value shows again.
-- Owner-only writes (enforced in the API route + audit-logged).

CREATE TABLE IF NOT EXISTS challenge_display_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  metric_key TEXT NOT NULL CHECK (metric_key IN (
    'sales_amount',
    'merch_ratio',
    'snacks_ratio',
    'panier_value',
    'opex_ratio',
    'review_volume_ratio',
    'review_rating_avg'
  )),
  display_value NUMERIC NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT challenge_display_overrides_unique
    UNIQUE (organization_id, location_id, month, metric_key)
);

CREATE INDEX IF NOT EXISTS challenge_display_overrides_month_idx
  ON challenge_display_overrides(organization_id, month);

COMMENT ON TABLE challenge_display_overrides IS 'Display-only overrides for challenge cards/PDFs (end-of-month print adjustments). Real Loyverse/accounting/counters/review data is never modified; DELETE reverts to the real value.';
