-- Reviews Stats tab — photo dimension. Adds the share of reviews that carry
-- reviewer-attached media (photos/videos) to the pre-aggregated groups, so
-- the tab can show a "with photos" rate per period/shop.
--
-- media_count is NULL for the handful of reviews Google no longer returns
-- (deleted) and for rows not yet backfilled: COALESCE to 0 counts them as
-- "without photos", matching their visible state on Google.

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
      SELECT coalesce(json_agg(json_build_object('location_id', t.location_id, 'title', t.title)), '[]'::json)
      FROM (
        SELECT DISTINCT ON (location_id) location_id, location_title AS title
        FROM reviews_cache
        WHERE location_title IS NOT NULL
        ORDER BY location_id, create_time DESC, update_time DESC
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
