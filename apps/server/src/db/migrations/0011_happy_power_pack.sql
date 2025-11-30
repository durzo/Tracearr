CREATE TABLE "mobile_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"refresh_token_hash" varchar(64) NOT NULL,
	"device_name" varchar(100) NOT NULL,
	"device_id" varchar(100) NOT NULL,
	"platform" varchar(20) NOT NULL,
	"expo_push_token" varchar(255),
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
CREATE TABLE "mobile_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	CONSTRAINT "mobile_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "mobile_sessions_device_id_idx" ON "mobile_sessions" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "mobile_sessions_refresh_token_idx" ON "mobile_sessions" USING btree ("refresh_token_hash");