import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { DatabaseTag } from "../db/layer";
import { bridgeEvents, bridgeWallets } from "../db/schema";

/**
 * Bridge event store over the plugin's own schema. Every query that reads an
 * event row scopes by `userId` — the ownership invariant lives in the query.
 */

export type StoreError = ORPCError<"CONFLICT" | "INTERNAL_SERVER_ERROR", { message: string }>;

export interface BridgeEventRow {
  id: string;
  userId: string;
  agentId: string;
  kind: string;
  usdCents: string;
  outlayerCostMicros: string | null;
  balanceRemainingUsd: string | null;
  outlayerKeyRemaining: string | null;
  connector: string | null;
  operation: string | null;
  createdAt: Date;
}

const storeError = (message: string): StoreError =>
  new ORPCError("INTERNAL_SERVER_ERROR", { message, data: { message } });

export class BridgeStore extends Context.Service<BridgeStore, BridgeStoreShape>()(
  "connectors/BridgeStore",
) {}

export interface RecordEventInput {
  userId: string;
  agentId: string;
  kind: "topup" | "call";
  usdCents: string;
  outlayerCostMicros?: string | null;
  balanceRemainingUsd?: string | null;
  outlayerKeyRemaining?: string | null;
  connector?: string | null;
  operation?: string | null;
}

export interface BridgeWalletRow {
  userId: string;
  agentId: string;
  walletApiKey: string;
  walletId: string | null;
  nearAccountId: string;
  paymentKey: string | null;
  paymentKeySource: string | null;
  connectedAt: Date;
  updatedAt: Date;
}

export interface BridgeStoreShape {
  record(input: RecordEventInput): Effect.Effect<string, StoreError>;
  list(userId: string, agentId: string, limit: number): Effect.Effect<BridgeEventRow[], StoreError>;
  getWallet(userId: string, agentId: string): Effect.Effect<BridgeWalletRow | null, StoreError>;
  upsertWallet(input: {
    userId: string;
    agentId: string;
    walletApiKey: string;
    walletId: string | null;
    nearAccountId: string;
  }): Effect.Effect<BridgeWalletRow, StoreError>;
  setPaymentKey(
    userId: string,
    agentId: string,
    paymentKey: string,
    source: string,
  ): Effect.Effect<void, StoreError>;
}

export const bridgeStoreLayer: Layer.Layer<BridgeStore, never, DatabaseTag> = Layer.effect(
  BridgeStore,
  Effect.gen(function* () {
    const db = yield* DatabaseTag;

    return BridgeStore.of({
      record: (input) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID();
          yield* Effect.tryPromise({
            try: () =>
              db.insert(bridgeEvents).values({
                id,
                userId: input.userId,
                agentId: input.agentId,
                kind: input.kind,
                usdCents: input.usdCents,
                outlayerCostMicros: input.outlayerCostMicros ?? null,
                balanceRemainingUsd: input.balanceRemainingUsd ?? null,
                outlayerKeyRemaining: input.outlayerKeyRemaining ?? null,
                connector: input.connector ?? null,
                operation: input.operation ?? null,
              }),
            catch: () => storeError("Failed to record bridge event"),
          });
          return id;
        }),

      list: (userId, agentId, limit) =>
        Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(bridgeEvents)
              .where(and(eq(bridgeEvents.userId, userId), eq(bridgeEvents.agentId, agentId)))
              .orderBy(desc(bridgeEvents.createdAt))
              .limit(limit),
          catch: () => storeError("Failed to list bridge events"),
        }),

      getWallet: (userId, agentId) =>
        Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(bridgeWallets)
              .where(and(eq(bridgeWallets.userId, userId), eq(bridgeWallets.agentId, agentId)))
              .limit(1)
              .then((rows) => rows[0] ?? null),
          catch: () => storeError("Failed to load the connected OutLayer wallet"),
        }),

      upsertWallet: (input) =>
        Effect.tryPromise({
          try: async () => {
            const [row] = await db
              .insert(bridgeWallets)
              .values({
                userId: input.userId,
                agentId: input.agentId,
                walletApiKey: input.walletApiKey,
                walletId: input.walletId,
                nearAccountId: input.nearAccountId,
              })
              .onConflictDoUpdate({
                target: [bridgeWallets.userId, bridgeWallets.agentId],
                set: {
                  walletApiKey: input.walletApiKey,
                  walletId: input.walletId,
                  nearAccountId: input.nearAccountId,
                  updatedAt: new Date(),
                },
              })
              .returning();
            return row!;
          },
          catch: () => storeError("Failed to save the OutLayer wallet connection"),
        }),

      setPaymentKey: (userId, agentId, paymentKey, source) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(bridgeWallets)
              .set({ paymentKey, paymentKeySource: source, updatedAt: new Date() })
              .where(and(eq(bridgeWallets.userId, userId), eq(bridgeWallets.agentId, agentId)));
          },
          catch: () => storeError("Failed to save the payment key"),
        }),
    });
  }),
);
