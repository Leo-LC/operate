-- Treasury cash counts — denomination-by-denomination till counts per shop.
--
-- A row records one physical count: how many of each THB note/coin were in
-- the drawer, the computed total, and which shop it belongs to. History is
-- kept (no upsert) so past counts stay visible for reference.

CREATE TABLE IF NOT EXISTS treasury_cash_counts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL,
  location_id     UUID        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  counted_at      DATE        NOT NULL DEFAULT CURRENT_DATE,
  counts          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  total           NUMERIC     NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS treasury_cash_counts_location_idx
  ON treasury_cash_counts(organization_id, location_id, counted_at DESC);

ALTER TABLE treasury_cash_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE treasury_cash_counts FROM anon, authenticated;
GRANT ALL ON TABLE treasury_cash_counts TO service_role;
COMMENT ON TABLE treasury_cash_counts IS 'Physical cash counts per shop: counts is {denomination_value: qty}, total is the computed ฿ sum. Inserted from Treasury → Cash counter.';
