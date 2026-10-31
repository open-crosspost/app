CREATE TABLE "bridge_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"kind" text NOT NULL,
	"usd_cents" text NOT NULL,
	"outlayer_cost_micros" text,
	"balance_remaining_usd" text,
	"outlayer_key_remaining" text,
	"connector" text,
	"operation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bridgeEvents_userId_idx" ON "bridge_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bridgeEvents_createdAt_idx" ON "bridge_events" USING btree ("created_at");