import { ORPCError } from "@orpc/server";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { DatabaseTag } from "../db/layer";
import { bridgeEvents, bridgeWallets } from "../db/schema";

/**
 * Bridge event store over the plugin's own schema. Every query that reads an
 * event row scopes by `userId` — the ownership invariant lives in the query —
 * except the sponsor aggregates, which are app-wide totals for the admin
 * dashboard and the public sponsorship stats.
 */

export type StoreError = ORPCError<"CONFLICT" | "INTERNAL_SERVER_ERROR", { message: string }>;

export interface SponsorWindow {
  posts: number;
  usdMicros: string;
}

export interface SponsorDailyPoint {
  date: string;
  posts: number;
  usdMicros: string;
}

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
  rowProfile: string | null;
  paymentKey: string | null;
  paymentKeySource: string | null;
  connectedAt: Date;
  updatedAt: Date;
}

export interface BridgeStoreShape {
  record(input: RecordEventInput): Effect.Effect<string, StoreError>;
  list(userId: string, agentId: string, limit: number): Effect.Effect<BridgeEventRow[], StoreError>;
  sponsorTotals(): Effect.Effect<
    { posts: number; usdMicros: string; lastSponsoredAt: string | null },
    StoreError
  >;
  sponsorSeries(
    days: number,
  ): Effect.Effect<
    { day: SponsorWindow; week: SponsorWindow; month: SponsorWindow; daily: SponsorDailyPoint[] },
    StoreError
  >;
  getWallet(userId: string, agentId: string): Effect.Effect<BridgeWalletRow | null, StoreError>;
  upsertWallet(input: {
    userId: string;
    agentId: string;
    walletApiKey: string;
    walletId: string | null;
    nearAccountId: string;
    rowProfile?: string | null;
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

      sponsorTotals: () =>
        Effect.tryPromise({
          try: async () => {
            const [row] = await db
              .select({
                posts: sql<number>`count(*)::int`,
                usdMicros: sql<string>`coalesce(sum(${bridgeEvents.outlayerCostMicros}::bigint), 0)::text`,
                lastSponsoredAt: sql<string | null>`max(${bridgeEvents.createdAt})::text`,
              })
              .from(bridgeEvents)
              .where(
                and(eq(bridgeEvents.kind, "call"), isNotNull(bridgeEvents.outlayerCostMicros)),
              );
            return {
              posts: row?.posts ?? 0,
              usdMicros: row?.usdMicros ?? "0",
              lastSponsoredAt: row?.lastSponsoredAt ?? null,
            };
          },
          catch: () => storeError("Failed to read sponsorship totals"),
        }),

      sponsorSeries: (days) =>
        Effect.tryPromise({
          try: async () => {
            const sponsored = and(
              eq(bridgeEvents.kind, "call"),
              isNotNull(bridgeEvents.outlayerCostMicros),
            );
            const windowAgg = async (since: Date): Promise<SponsorWindow> => {
              const [row] = await db
                .select({
                  posts: sql<number>`count(*)::int`,
                  usdMicros: sql<string>`coalesce(sum(${bridgeEvents.outlayerCostMicros}::bigint), 0)::text`,
                })
                .from(bridgeEvents)
                .where(and(sponsored, gte(bridgeEvents.createdAt, since)));
              return { posts: row?.posts ?? 0, usdMicros: row?.usdMicros ?? "0" };
            };

            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const sparse = await db
              .select({
                date: sql<string>`to_char(date_trunc('day', ${bridgeEvents.createdAt}), 'YYYY-MM-DD')`,
                posts: sql<number>`count(*)::int`,
                usdMicros: sql<string>`coalesce(sum(${bridgeEvents.outlayerCostMicros}::bigint), 0)::text`,
              })
              .from(bridgeEvents)
              .where(and(sponsored, gte(bridgeEvents.createdAt, since)))
              .groupBy(sql`date_trunc('day', ${bridgeEvents.createdAt})`)
              .orderBy(sql`date_trunc('day', ${bridgeEvents.createdAt})`);

            const byDate = new Map(sparse.map((row) => [row.date, row]));
            const daily: SponsorDailyPoint[] = [];
            for (let offset = days - 1; offset >= 0; offset--) {
              const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10);
              const row = byDate.get(date);
              daily.push({
                date,
                posts: row?.posts ?? 0,
                usdMicros: row?.usdMicros ?? "0",
              });
            }

            return {
              day: await windowAgg(new Date(Date.now() - 24 * 60 * 60 * 1000)),
              week: await windowAgg(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
              month: await windowAgg(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
              daily,
            };
          },
          catch: () => storeError("Failed to read sponsor spend series"),
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
                rowProfile: input.rowProfile ?? null,
              })
              .onConflictDoUpdate({
                target: [bridgeWallets.userId, bridgeWallets.agentId],
                set: {
                  walletApiKey: input.walletApiKey,
                  walletId: input.walletId,
                  nearAccountId: input.nearAccountId,
                  rowProfile: input.rowProfile ?? null,
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
