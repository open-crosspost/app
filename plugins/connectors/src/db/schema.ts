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
    rowProfile: text("row_profile"),
    paymentKey: text("payment_key"),
    paymentKeySource: text("payment_key_source"),
    connectedAt: timestamp("connected_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.agentId] })],
);

/**
 * Dynamic tier thresholds for the XPOST admission gate — a singleton row
 * (`id = 'xpost'`). Balances are human-unit strings; the daily price refresh
 * recomputes them from the Ref pools (source: "auto") and an admin can pin
 * them by hand (source: "manual"). Absent row = the plugin-variable ladder.
 */
export const gateConfig = pgTable("gate_config", {
  id: text("id").primaryKey().default("xpost"),
  tier1Balance: text("tier1_balance").notNull(),
  tier2Balance: text("tier2_balance").notNull(),
  tier3Balance: text("tier3_balance").notNull(),
  priceUsd: text("price_usd"),
  source: text("source").notNull().default("auto"),
  refreshedAt: timestamp("refreshed_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});
