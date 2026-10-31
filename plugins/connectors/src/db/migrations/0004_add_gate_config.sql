CREATE TABLE "gate_config" (
	"id" text PRIMARY KEY DEFAULT 'xpost' NOT NULL,
	"tier1_balance" text NOT NULL,
	"tier2_balance" text NOT NULL,
	"tier3_balance" text NOT NULL,
	"price_usd" text,
	"source" text DEFAULT 'auto' NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
