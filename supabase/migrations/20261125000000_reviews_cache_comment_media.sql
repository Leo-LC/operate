-- Reviews archive — store the reviewer's text and attached media count so
-- `reviews_cache` holds the full review (not just ratings metadata) for later
-- analysis (date, origin/shop, content, photos).
--
-- `reviews_cache` predates the migrations history (no CREATE TABLE in the
-- repo): these are additive ALTERs, safe to re-run.
--
-- Backfill happens on the next *full* sync — `POST /api/challenges/reviews/sync?full=1`
-- or the monthly full pass (day 1–2 of the month): a full sync rewrites every
-- row instead of only new/changed ones. Incremental syncs only touch recent
-- reviews, so rows from before this migration keep media_count NULL until
-- then. `media_count IS NOT NULL` can be used to track backfill progress.

ALTER TABLE reviews_cache ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE reviews_cache ADD COLUMN IF NOT EXISTS media_count SMALLINT;

COMMENT ON COLUMN reviews_cache.comment IS 'Reviewer text of the Google review (the guest''s comment, not the owner reply).';
COMMENT ON COLUMN reviews_cache.media_count IS 'Media items (photos/videos) the reviewer attached to the review. 0 = none; NULL = unknown (row written before Nov 2026 and not yet backfilled by a full sync).';
