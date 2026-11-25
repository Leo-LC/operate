-- Fix: restore the canonical titles block of reviews_cache_stats.
--
-- 20261125000001 (photos) rewrote the function from the pre-20261024000003
-- version and regressed two things:
--   1. titles were exposed as `location_id` (snake_case) while the TS lib
--      reads `locationId` → every shop name ignored, the UI showed raw GBP
--      ids ("locations/123…");
--   2. the `locations` join was lost → Admin → Shops renames no longer won.
--
-- This restores the 20261024000003 titles block verbatim and keeps the
-- with_media dimension added for the photo rate.

CREATE OR REPLACE FUNCTION public.reviews_cache_stats(
  p_prior_from timestamptz,
  p_current_from timestamptz,
  p_current_to timestamptz,
  p_bucket text
) RETURNS json
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT json_build_object(
    'titles', (
      SELECT coalesce(json_agg(json_build_object('locationId', t.location_id, 'title', t.title)), '[]'::json)
      FROM (
        SELECT DISTINCT ON (l.location_id)
          l.location_id,
          coalesce(loc.name, l.location_title, l.location_id) AS title
        FROM reviews_cache l
        LEFT JOIN locations loc ON loc.external_id = l.location_id
        WHERE l.location_title IS NOT NULL
        ORDER BY l.location_id, l.create_time DESC, l.update_time DESC
      ) t
    ),
    'parts', (
      SELECT coalesce(json_agg(json_build_object(
        'locationId', l.location_id,
        'period', l.period,
        'star', l.star_rating,
        'replied', l.has_reply,
        'withMedia', l.with_media,
        'key', l.key,
        'n', l.n
      )), '[]'::json)
      FROM (
        SELECT
          location_id,
          CASE WHEN create_time >= p_current_from THEN 'current' ELSE 'prior' END AS period,
          star_rating,
          has_reply,
          COALESCE(media_count, 0) > 0 AS with_media,
          CASE
            WHEN create_time < p_current_from THEN ''
            WHEN p_bucket = 'day' THEN to_char(create_time, 'YYYY-MM-DD')
            WHEN p_bucket = 'week' THEN to_char(date_trunc('week', create_time), 'YYYY-MM-DD')
            ELSE to_char(date_trunc('month', create_time), 'YYYY-MM')
          END AS key,
          count(*) AS n
        FROM reviews_cache
        WHERE create_time >= p_prior_from
          AND create_time < p_current_to
          AND star_rating BETWEEN 1 AND 5
        GROUP BY 1, 2, 3, 4, 5, 6
      ) l
    )
  );
$$;

-- Service-role only, like the tables it reads.
REVOKE ALL ON FUNCTION public.reviews_cache_stats(timestamptz, timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reviews_cache_stats(timestamptz, timestamptz, timestamptz, text) TO service_role;
