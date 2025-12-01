DROP INDEX "users_external_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "users_server_external_id_unique" ON "users" USING btree ("server_id","external_id");