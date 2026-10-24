-- Aggregation for the Reviews Stats tab. reviews_cache holds ~10k Google
-- reviews; Supabase caps row payloads at 1000 per request, so the API route
-- reads pre-grouped counts from this function instead of raw rows.
--
-- Returns:
--   titles: latest display title per location (Admin → Shops renames win upstream)
--   parts:  one row per (location, period, star rating, replied?, time bucket)
--           with n = number of reviews; bucket key '' for the prior period.
--           Bucketing is UTC to match the API route's period bounds.
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
        'key', l.key,
        'n', l.n
      )), '[]'::json)
      FROM (
        SELECT
          location_id,
          CASE WHEN create_time >= p_current_from THEN 'current' ELSE 'prior' END AS period,
          star_rating,
          has_reply,
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
        GROUP BY 1, 2, 3, 4, 5
      ) l
    )
  );
$$;

-- Service-role only, like the tables it reads.
REVOKE ALL ON FUNCTION public.reviews_cache_stats(timestamptz, timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reviews_cache_stats(timestamptz, timestamptz, timestamptz, text) TO service_role;
