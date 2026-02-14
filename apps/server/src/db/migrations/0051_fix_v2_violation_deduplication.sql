DELETE FROM "violations"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "server_user_id", "session_id", "rule_id"
        ORDER BY "created_at" ASC
      ) as rn
    FROM "violations"
    WHERE "acknowledged_at" IS NULL
      AND "session_id" IS NOT NULL
  ) ranked
  WHERE rn > 1
);

DROP INDEX IF EXISTS "violations_unique_active_user_session_type";

CREATE UNIQUE INDEX "violations_unique_active_user_session_rule"
ON "violations" ("server_user_id", "session_id", "rule_id")
WHERE "acknowledged_at" IS NULL AND "session_id" IS NOT NULL;
