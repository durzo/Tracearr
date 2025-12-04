CREATE TABLE "notification_channel_routing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"discord_enabled" boolean DEFAULT true NOT NULL,
	"webhook_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_channel_routing_event_type_unique" UNIQUE("event_type")
);
--> statement-breakpoint
CREATE INDEX "notification_channel_routing_event_type_idx" ON "notification_channel_routing" USING btree ("event_type");
--> statement-breakpoint
-- Seed default routing configuration for all event types
INSERT INTO "notification_channel_routing" ("event_type", "discord_enabled", "webhook_enabled", "push_enabled")
VALUES
  ('violation_detected', true, true, true),
  ('stream_started', false, false, false),
  ('stream_stopped', false, false, false),
  ('concurrent_streams', true, true, true),
  ('new_device', true, true, true),
  ('trust_score_changed', false, false, false),
  ('server_down', true, true, true),
  ('server_up', true, true, true)
ON CONFLICT ("event_type") DO NOTHING;