-- Loyverse integration — Phase 1 pipeline tables (read-only snapshots, never writes daily_entries)
-- Mirrors aggregator output (ProposedDailyEntry + challenges + meta) per account/store/date

CREATE TABLE IF NOT EXISTS loyverse_daily_snapshots (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key           TEXT        NOT NULL,
  store_id              TEXT        NOT NULL,
  location_id           UUID        REFERENCES locations(id) ON DELETE SET NULL,
  date                  DATE        NOT NULL,

  -- Sales buckets (net, VAT-inclusive as stored by Loyverse)
  sales_drinks_net      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_ticket_net      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_snack_net       NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_goodies_net     NUMERIC(12,2) NOT NULL DEFAULT 0,
  sales_card_surcharge  NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Tax & payments
  vat_7                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_cash          NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_scan          NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_credit_card   NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Counts & derived
  receipt_count         INTEGER     NOT NULL DEFAULT 0,
  sale_count            INTEGER     NOT NULL DEFAULT 0,
  refund_count          INTEGER     NOT NULL DEFAULT 0,
  cancelled_count       INTEGER     NOT NULL DEFAULT 0,
  revenue_total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  snacks_sold           INTEGER     NOT NULL DEFAULT 0,
  avg_ticket            NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Quality signals
  unmapped_line_items   INTEGER     NOT NULL DEFAULT 0,
  unmapped_payments     INTEGER     NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT loyverse_daily_snapshots_unique UNIQUE (account_key, store_id, date)
);

CREATE INDEX IF NOT EXISTS loyverse_daily_snapshots_date_idx ON loyverse_daily_snapshots(date DESC);
CREATE INDEX IF NOT EXISTS loyverse_daily_snapshots_location_idx ON loyverse_daily_snapshots(location_id, date DESC);
CREATE INDEX IF NOT EXISTS loyverse_daily_snapshots_account_idx ON loyverse_daily_snapshots(account_key, date DESC);

ALTER TABLE loyverse_daily_snapshots ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; owner read policy as defense-in-depth (like sheet_sync_config)
CREATE POLICY "loyverse_daily_snapshots_owner_select" ON loyverse_daily_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'owner'
    )
  );

-- Sync runs: one row per POST /api/loyverse/sync or cron invocation
CREATE TABLE IF NOT EXISTS loyverse_sync_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status            TEXT        NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  triggered_by      TEXT        NOT NULL CHECK (triggered_by IN ('manual', 'cron')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at       TIMESTAMPTZ,
  duration_ms       INTEGER,
  total_accounts    INTEGER     NOT NULL DEFAULT 0,
  total_stores      INTEGER     NOT NULL DEFAULT 0,
  total_snapshots   INTEGER     NOT NULL DEFAULT 0,
  per_account       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loyverse_sync_runs_started_idx ON loyverse_sync_runs(started_at DESC);

ALTER TABLE loyverse_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyverse_sync_runs_owner_select" ON loyverse_sync_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'owner'
    )
  );
