CREATE TABLE "bridge_wallets" (
	"user_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"wallet_api_key" text NOT NULL,
	"wallet_id" text,
	"near_account_id" text NOT NULL,
	"payment_key" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bridge_wallets_user_id_agent_id_pk" PRIMARY KEY("user_id","agent_id")
);
