ALTER TABLE "settings" ADD COLUMN "backup_schedule_type" varchar(20) DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "backup_schedule_time" varchar(5) DEFAULT '02:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "backup_schedule_day_of_week" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "backup_schedule_day_of_month" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "backup_retention_count" integer DEFAULT 7 NOT NULL;