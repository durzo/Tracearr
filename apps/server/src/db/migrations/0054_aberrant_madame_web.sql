ALTER TABLE "settings" ADD COLUMN "tailscale_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tailscale_state" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tailscale_hostname" varchar(255);