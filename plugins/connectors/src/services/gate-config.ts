import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { DatabaseTag } from "../db/layer";
import { gateConfig } from "../db/schema";

/**
 * Singleton config row (`id = 'xpost'`) for the dynamic tier thresholds —
 * written by the daily price refresh (source: "auto") or pinned by an admin
 * (source: "manual", which the daemon respects until cleared).
 */

export type GateStoreError = ORPCError<"INTERNAL_SERVER_ERROR", { message: string }>;

const gateStoreError = (message: string): GateStoreError =>
  new ORPCError("INTERNAL_SERVER_ERROR", { message, data: { message } });

export interface GateConfigRow {
  id: string;
  tier1Balance: string;
  tier2Balance: string;
  tier3Balance: string;
  priceUsd: string | null;
  source: string;
  refreshedAt: Date;
}

export interface GateConfigSetInput {
  tier1Balance: string;
  tier2Balance: string;
  tier3Balance: string;
  priceUsd: string | null;
  source: string;
}

export class GateConfigStore extends Context.Service<GateConfigStore, GateConfigStoreShape>()(
  "connectors/GateConfigStore",
) {}

export interface GateConfigStoreShape {
  get(): Effect.Effect<GateConfigRow | null, GateStoreError>;
  set(input: GateConfigSetInput): Effect.Effect<GateConfigRow, GateStoreError>;
}

export const XPOST_GATE_CONFIG_ID = "xpost";

export const gateConfigStoreLayer: Layer.Layer<GateConfigStore, never, DatabaseTag> = Layer.effect(
  GateConfigStore,
  Effect.gen(function* () {
    const db = yield* DatabaseTag;

    return GateConfigStore.of({
      get: () =>
        Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(gateConfig)
              .where(eqId())
              .limit(1)
              .then((rows) => rows[0] ?? null),
          catch: () => gateStoreError("Failed to load the XPOST gate config"),
        }),

      set: (input) =>
        Effect.tryPromise({
          try: async () => {
            const [row] = await db
              .insert(gateConfig)
              .values({
                id: XPOST_GATE_CONFIG_ID,
                tier1Balance: input.tier1Balance,
                tier2Balance: input.tier2Balance,
                tier3Balance: input.tier3Balance,
                priceUsd: input.priceUsd,
                source: input.source,
                refreshedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: gateConfig.id,
                set: {
                  tier1Balance: input.tier1Balance,
                  tier2Balance: input.tier2Balance,
                  tier3Balance: input.tier3Balance,
                  priceUsd: input.priceUsd,
                  source: input.source,
                  refreshedAt: new Date(),
                },
              })
              .returning();
            return row!;
          },
          catch: () => gateStoreError("Failed to save the XPOST gate config"),
        }),
    });
  }),
);

const eqId = () => eq(gateConfig.id, XPOST_GATE_CONFIG_ID);
