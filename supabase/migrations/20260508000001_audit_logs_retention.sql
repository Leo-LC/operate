-- Enable pg_cron extension (available on Supabase hosted projects).
-- Schedule a daily job at 03:00 UTC to purge audit logs older than 90 days.
-- If pg_cron is not available on this project tier, this will error — remove safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'delete-old-audit-logs',
      '0 3 * * *',
      $$DELETE FROM public.audit_logs WHERE created_at < now() - interval '90 days'$$
    );
  END IF;
END $$;
