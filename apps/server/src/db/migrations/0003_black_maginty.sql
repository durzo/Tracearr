CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mobile_session_id" uuid NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"on_violation_detected" boolean DEFAULT true NOT NULL,
	"on_stream_started" boolean DEFAULT false NOT NULL,
	"on_stream_stopped" boolean DEFAULT false NOT NULL,
	"on_concurrent_streams" boolean DEFAULT true NOT NULL,
	"on_new_device" boolean DEFAULT true NOT NULL,
	"on_trust_score_changed" boolean DEFAULT false NOT NULL,
	"on_server_down" boolean DEFAULT true NOT NULL,
	"on_server_up" boolean DEFAULT true NOT NULL,
	"violation_min_severity" integer DEFAULT 1 NOT NULL,
	"violation_rule_types" text[] DEFAULT '{}',
	"max_per_minute" integer DEFAULT 10 NOT NULL,
	"max_per_hour" integer DEFAULT 60 NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"quiet_hours_timezone" varchar(50) DEFAULT 'UTC',
	"quiet_hours_override_critical" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_mobile_session_id_unique" UNIQUE("mobile_session_id")
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_mobile_session_id_mobile_sessions_id_fk" FOREIGN KEY ("mobile_session_id") REFERENCES "public"."mobile_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_prefs_mobile_session_idx" ON "notification_preferences" USING btree ("mobile_session_id");