-- Fix engagement functions: align play counting with our "watched" tier (85%)
-- Use plpgsql to defer validation (daily_content_engagement may not exist during migrations)
DROP FUNCTION IF EXISTS get_content_engagement(timestamptz, timestamptz, uuid, text);
--> statement-breakpoint
DROP FUNCTION IF EXISTS get_show_engagement(timestamptz, timestamptz, uuid);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION get_content_engagement(
  start_date timestamptz,
  end_date timestamptz,
  filter_server_id uuid DEFAULT NULL,
  filter_media_type text DEFAULT NULL
)
RETURNS TABLE (
  rating_key varchar(255),
  media_title text,
  show_title text,
  media_type text,
  content_duration_ms bigint,
  thumb_path text,
  server_id uuid,
  year integer,
  total_plays bigint,
  total_watched_ms numeric,
  total_watch_hours numeric,
  unique_viewers bigint,
  completions bigint,
  completion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  -- Level 1: Aggregate per (user, content) across all matching days
  WITH user_content AS (
    SELECT
      d.rating_key,
      d.server_user_id,
      MAX(d.media_title) AS media_title,
      MAX(d.show_title) AS show_title,
      MAX(d.media_type) AS media_type,
      MAX(d.content_duration_ms) AS content_duration_ms,
      MAX(d.thumb_path) AS thumb_path,
      (array_agg(d.server_id))[1] AS server_id,
      MAX(d.year) AS year,
      SUM(d.watched_ms) AS watched_ms
    FROM daily_content_engagement d
    WHERE d.day >= start_date
      AND d.day < end_date
      AND (filter_server_id IS NULL OR d.server_id = filter_server_id)
      AND (filter_media_type IS NULL OR d.media_type = filter_media_type)
    GROUP BY d.rating_key, d.server_user_id
  )
  -- Level 2: Aggregate across users, calculating plays aligned with "watched" tier
  SELECT
    uc.rating_key,
    MAX(uc.media_title) AS media_title,
    MAX(uc.show_title) AS show_title,
    MAX(uc.media_type) AS media_type,
    MAX(uc.content_duration_ms) AS content_duration_ms,
    MAX(uc.thumb_path) AS thumb_path,
    (array_agg(uc.server_id))[1] AS server_id,
    MAX(uc.year) AS year,
    -- Play = "watched" by our definition (85%+). GREATEST handles rewatches (200%+ = 2 plays)
    SUM(CASE
      WHEN uc.content_duration_ms > 0 THEN
        GREATEST(
          CASE WHEN uc.watched_ms >= uc.content_duration_ms * 0.85 THEN 1 ELSE 0 END,
          FLOOR(uc.watched_ms::float / uc.content_duration_ms)
        )
      ELSE 0
    END)::bigint AS total_plays,
    SUM(uc.watched_ms) AS total_watched_ms,
    ROUND(SUM(uc.watched_ms) / 3600000.0, 1) AS total_watch_hours,
    COUNT(DISTINCT uc.server_user_id)::bigint AS unique_viewers,
    COUNT(DISTINCT uc.server_user_id) FILTER (
      WHERE uc.content_duration_ms > 0
        AND uc.watched_ms >= uc.content_duration_ms * 0.85
    )::bigint AS completions,
    ROUND(100.0 * COUNT(DISTINCT uc.server_user_id) FILTER (
      WHERE uc.content_duration_ms > 0
        AND uc.watched_ms >= uc.content_duration_ms * 0.85
    ) / NULLIF(COUNT(DISTINCT uc.server_user_id), 0), 1) AS completion_rate
  FROM user_content uc
  GROUP BY uc.rating_key;
END;
$$ LANGUAGE plpgsql STABLE;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION get_show_engagement(
  start_date timestamptz,
  end_date timestamptz,
  filter_server_id uuid DEFAULT NULL
)
RETURNS TABLE (
  show_title text,
  server_id uuid,
  thumb_path text,
  year integer,
  total_episode_views bigint,
  total_watch_hours numeric,
  unique_viewers bigint,
  avg_completion_rate numeric,
  binge_score numeric
) AS $$
BEGIN
  RETURN QUERY
  -- Level 1: Aggregate per (user, episode) across all matching days
  WITH user_episodes AS (
    SELECT
      d.rating_key,
      d.server_user_id,
      MAX(d.show_title) AS show_title,
      MAX(d.content_duration_ms) AS content_duration_ms,
      MAX(d.thumb_path) AS thumb_path,
      (array_agg(d.server_id))[1] AS server_id,
      MAX(d.year) AS year,
      SUM(d.watched_ms) AS watched_ms,
      COUNT(DISTINCT d.day) AS viewing_days
    FROM daily_content_engagement d
    WHERE d.day >= start_date
      AND d.day < end_date
      AND d.show_title IS NOT NULL
      AND d.media_type = 'episode'
      AND (filter_server_id IS NULL OR d.server_id = filter_server_id)
    GROUP BY d.rating_key, d.server_user_id
  ),
  -- Level 2: Aggregate per (user, show) to get per-user show stats
  user_shows AS (
    SELECT
      ue.server_user_id,
      ue.show_title,
      MAX(ue.thumb_path) AS thumb_path,
      (array_agg(ue.server_id))[1] AS server_id,
      MAX(ue.year) AS year,
      COUNT(DISTINCT ue.rating_key) AS episodes_watched,
      SUM(ue.watched_ms) AS total_watched_ms,
      SUM(CASE
        WHEN ue.content_duration_ms > 0 THEN
          GREATEST(
            CASE WHEN ue.watched_ms >= ue.content_duration_ms * 0.85 THEN 1 ELSE 0 END,
            FLOOR(ue.watched_ms::float / ue.content_duration_ms)
          )
        ELSE 0
      END) AS episode_plays,
      SUM(ue.viewing_days) AS total_viewing_days,
      COUNT(DISTINCT ue.rating_key) FILTER (
        WHERE ue.content_duration_ms > 0
          AND ue.watched_ms >= ue.content_duration_ms * 0.85
      ) AS completed_episodes
    FROM user_episodes ue
    GROUP BY ue.server_user_id, ue.show_title
  )
  -- Level 3: Aggregate across users for show-level stats
  SELECT
    us.show_title,
    (array_agg(us.server_id))[1] AS server_id,
    MAX(us.thumb_path) AS thumb_path,
    MAX(us.year) AS year,
    SUM(us.episode_plays)::bigint AS total_episode_views,
    ROUND(SUM(us.total_watched_ms) / 3600000.0, 1) AS total_watch_hours,
    COUNT(DISTINCT us.server_user_id)::bigint AS unique_viewers,
    ROUND(100.0 * SUM(us.completed_episodes) / NULLIF(SUM(us.episodes_watched), 0), 1) AS avg_completion_rate,
    -- Binge score (0-100): volume*quality(40%) + intensity(30%) + completion(30%)
    LEAST(100, ROUND(
      40 * (AVG(us.episodes_watched)::numeric * ROUND(100.0 * SUM(us.completed_episodes) / NULLIF(SUM(us.episodes_watched), 0), 1) / 100 / 10) +
      30 * (SUM(us.total_viewing_days)::numeric / NULLIF(COUNT(DISTINCT us.server_user_id), 0) * 2) +
      30 * (SUM(us.completed_episodes)::numeric / NULLIF(SUM(us.episodes_watched), 0))
    , 0)) AS binge_score
  FROM user_shows us
  GROUP BY us.show_title;
END;
$$ LANGUAGE plpgsql STABLE;
