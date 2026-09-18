-- Probation write-back : log quotidien Loyverse vs daily_entries (D)
-- Stocke l'écart par jour/shop pour le compteur "X jours sans différence" + diagnostic.

CREATE TABLE IF NOT EXISTS loyverse_reconciliation_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  location_id      UUID        REFERENCES locations(id) ON DELETE SET NULL,
  location_name    TEXT,
  loyverse_total   NUMERIC     NOT NULL DEFAULT 0,
  accounting_total NUMERIC     NOT NULL DEFAULT 0,
  diff             NUMERIC     NOT NULL DEFAULT 0,
  diff_pct         NUMERIC     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'match' CHECK (status IN ('match', 'mismatch', 'missing_snapshot', 'missing_entry')),
  checked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyverse_reconciliation_unique UNIQUE (organization_id, date, location_id)
);

CREATE INDEX IF NOT EXISTS loyverse_reconciliation_date_idx ON loyverse_reconciliation_logs(date DESC);
CREATE INDEX IF NOT EXISTS loyverse_reconciliation_status_idx ON loyverse_reconciliation_logs(status, date DESC);

ALTER TABLE loyverse_reconciliation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyverse_reconciliation_owner_select" ON loyverse_reconciliation_logs;
CREATE POLICY "loyverse_reconciliation_owner_select" ON loyverse_reconciliation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.global_role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE loyverse_reconciliation_logs IS 'Probation write-back : écart quotidien Loyverse vs daily_entries par shop. Alimenté par GET /api/loyverse/reconciliation.';
