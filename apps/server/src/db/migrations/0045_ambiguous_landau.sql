-- Drop views that depend on sessions.grandparent_title
-- These will be recreated by initTimescaleDB() on server startup
DROP VIEW IF EXISTS top_shows_by_engagement CASCADE;
DROP VIEW IF EXISTS show_engagement_summary CASCADE;
DROP VIEW IF EXISTS user_engagement_profile CASCADE;
DROP VIEW IF EXISTS top_content_by_plays CASCADE;
DROP VIEW IF EXISTS daily_show_intensity CASCADE;
DROP VIEW IF EXISTS content_engagement_summary CASCADE;
DROP VIEW IF EXISTS episode_continuity_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS daily_content_engagement CASCADE;
--> statement-breakpoint
ALTER TABLE "library_items" ALTER COLUMN "title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "library_items" ALTER COLUMN "grandparent_title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "library_items" ALTER COLUMN "parent_title" SET DATA TYPE text;--> statement-breakpoint
-- Handle sessions table specially for TimescaleDB hypertables with compression
DO $$
DECLARE
  is_hypertable boolean;
  compression_enabled boolean;
  job_id integer;
BEGIN
  -- Check if sessions is a TimescaleDB hypertable
  SELECT EXISTS(
    SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'sessions'
  ) INTO is_hypertable;

  IF is_hypertable THEN
    -- Check if compression is enabled
    SELECT h.compression_enabled INTO compression_enabled
    FROM timescaledb_information.hypertables h
    WHERE h.hypertable_name = 'sessions';

    IF compression_enabled THEN
      -- Find and pause compression policy
      SELECT j.job_id INTO job_id
      FROM timescaledb_information.jobs j
      WHERE j.proc_name = 'policy_compression'
        AND j.hypertable_name = 'sessions';

      IF job_id IS NOT NULL THEN
        PERFORM alter_job(job_id, scheduled => false);
      END IF;

      -- Decompress all chunks (bulk operation)
      PERFORM decompress_chunk(c, if_compressed => true) FROM show_chunks('sessions') c;

      -- Disable compression
      ALTER TABLE sessions SET (timescaledb.compress = false);
    END IF;

    -- Now safe to alter the column
    ALTER TABLE "sessions" ALTER COLUMN "grandparent_title" SET DATA TYPE text;

    IF compression_enabled THEN
      -- Re-enable compression with explicit orderby (fixes 32-column limit issue)
      ALTER TABLE sessions SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = 'server_user_id, server_id',
        timescaledb.compress_orderby = 'started_at DESC, id'
      );

      -- Re-enable compression policy
      IF job_id IS NOT NULL THEN
        PERFORM alter_job(job_id, scheduled => true);
      END IF;
    END IF;
  ELSE
    -- Not a hypertable, just alter directly
    ALTER TABLE "sessions" ALTER COLUMN "grandparent_title" SET DATA TYPE text;
  END IF;

EXCEPTION WHEN undefined_table THEN
  -- TimescaleDB not installed, just alter directly
  ALTER TABLE "sessions" ALTER COLUMN "grandparent_title" SET DATA TYPE text;
END $$;
