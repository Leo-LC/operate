-- Disk IO optimization pass (Supabase Disk IO Budget warning)
--
-- 1. Index audit_logs(created_at) so the nightly pg_cron retention job
--    (DELETE ... WHERE created_at < now() - interval '90 days') uses an
--    index scan instead of a full table scan that grows with the table.
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

-- 2. Pre-aggregated monthly sales per location so Reports no longer pulls
--    every daily_entries row (select "*", paginated past PostgREST's 1000-row
--    cap) just to sum sales in Node. Sum matches salesNetTotal() in
--    src/modules/accounting/types.ts.
CREATE OR REPLACE VIEW monthly_revenue_by_location AS
SELECT
  organization_id,
  location_id,
  EXTRACT(YEAR FROM entry_date)::int  AS year,
  EXTRACT(MONTH FROM entry_date)::int AS month,
  COALESCE(
    sum(
      sales_drinks_net + sales_ticket_net + sales_snack_net
      + sales_goodies_net + sales_card_surcharge
    ),
    0
  ) AS amount
FROM daily_entries
GROUP BY
  organization_id,
  location_id,
  EXTRACT(YEAR FROM entry_date),
  EXTRACT(MONTH FROM entry_date);

COMMENT ON VIEW monthly_revenue_by_location IS
  'Monthly sum of daily_entries sales columns (same formula as salesNetTotal). Used by /api/reports/revenue-comparison to avoid full-year row pulls.';