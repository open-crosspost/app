import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Metered-connectors bridge tables (own plugin schema, `plugin_connectors`).
 *
 * `user_id` is the Better Auth user id resolved from the request context
 * server-side — never trusted from client input; no FK (the user table lives
 * in the auth plugin's database).
 */

export const bridgeEvents = pgTable(
  "bridge_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    agentId: text("agent_id").notNull(),
    kind: text("kind").notNull(), // "topup" | "call"
    usdCents: text("usd_cents").notNull(),
    outlayerCostMicros: text("outlayer_cost_micros"),
    balanceRemainingUsd: text("balance_remaining_usd"),
    outlayerKeyRemaining: text("outlayer_key_remaining"),
    connector: text("connector"),
    operation: text("operation"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("bridgeEvents_userId_idx").on(table.userId),
    index("bridgeEvents_createdAt_idx").on(table.createdAt),
  ],
);

export const bridgeWallets = pgTable(
  "bridge_wallets",
  {
    userId: text("user_id").notNull(),
    agentId: text("agent_id").notNull(),
    walletApiKey: text("wallet_api_key").notNull(),
    walletId: text("wallet_id"),
    nearAccountId: text("near_account_id").notNull(),
    paymentKey: text("payment_key"),
    paymentKeySource: text("payment_key_source"),
    connectedAt: timestamp("connected_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.agentId] })],
);
