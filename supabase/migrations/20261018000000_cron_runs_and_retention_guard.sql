-- Cron observability + pg_cron retention guard.
--
-- 1. cron_runs: one row per scheduled automation run, written best-effort by the
--    cron handlers (src/lib/cron.ts). Without it a failed nightly sync is silent —
--    Vercel never reads the JSON a cron route returns.
-- 2. Re-assert the nightly audit-log retention job. The original migration
--    (20260508000001) used nested $$ dollar-quotes, which PostgreSQL does NOT
--    nest: the DO body is terminated early by the inner $$, so that migration is
--    a syntax error and the retention job has likely never been scheduled.

CREATE TABLE IF NOT EXISTS cron_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  job             TEXT NOT NULL,
  triggered_by    TEXT NOT NULL DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'manual')),
  started_at      TIMESTAMPTZ NOT NULL,
  finished_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok              BOOLEAN NOT NULL,
  result          JSONB
);

-- Service-role only (no policies): read from the Admin > Automations page via the
-- server client, never exposed to the browser.
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS cron_runs_job_idx       ON cron_runs(job, started_at DESC);
CREATE INDEX IF NOT EXISTS cron_runs_recent_idx    ON cron_runs(started_at DESC);

-- Nightly purge of audit logs older than 90 days (03:00 UTC).
-- Idempotent: unschedule first (returns false when the job does not exist), so
-- re-applying this migration never leaves duplicate jobs behind.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('delete-old-audit-logs');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- no such job yet
    END;
    PERFORM cron.schedule(
      'delete-old-audit-logs',
      '0 3 * * *',
      $sql$DELETE FROM public.audit_logs WHERE created_at < now() - interval '90 days'$$sql$
    );
  END IF;
END
$do$;
