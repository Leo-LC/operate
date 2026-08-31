-- Archive brute des shift reports Loyverse (J-30 max côté API) pour historique infini
-- Stocke le JSON tel quel retourné par GET /shifts par (account, store, date Bangkok)
-- Léger: quelques KB/jour/store vs receipts (100-300 receipts/jour = MB)

CREATE TABLE IF NOT EXISTS loyverse_shifts_raw (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_key   TEXT        NOT NULL,
  store_id      TEXT        NOT NULL,
  location_id   UUID        REFERENCES locations(id) ON DELETE SET NULL,
  date          DATE        NOT NULL,
  shifts        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  shift_count   INTEGER     NOT NULL DEFAULT 0,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyverse_shifts_raw_unique UNIQUE (account_key, store_id, date)
);

CREATE INDEX IF NOT EXISTS loyverse_shifts_raw_date_idx ON loyverse_shifts_raw(date DESC);
CREATE INDEX IF NOT EXISTS loyverse_shifts_raw_store_date_idx ON loyverse_shifts_raw(store_id, date DESC);
CREATE INDEX IF NOT EXISTS loyverse_shifts_raw_account_date_idx ON loyverse_shifts_raw(account_key, date DESC);
CREATE INDEX IF NOT EXISTS loyverse_shifts_raw_location_idx ON loyverse_shifts_raw(location_id, date DESC) WHERE location_id IS NOT NULL;

ALTER TABLE loyverse_shifts_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyverse_shifts_raw_owner_select" ON loyverse_shifts_raw
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role = 'owner'
    )
  );

COMMENT ON TABLE loyverse_shifts_raw IS 'Archive JSON brute des shifts Loyverse par jour/store (Bangkok). Alimenté par cron quotidien loyverse-sync, contourne la fenêtre J-30 de l API.';
COMMENT ON COLUMN loyverse_shifts_raw.shifts IS 'Payload brut GET /shifts filtré created_at_min/max pour ce jour Bangkok (array). Stocké tel quel pour retraitement futur.';
