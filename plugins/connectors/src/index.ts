import { ORPCError } from "@orpc/server";
import { Context, Effect, Layer } from "effect";
import { createPlugin } from "every-plugin";
import { z } from "zod";
import { contract } from "./contract";
import { DatabaseLive } from "./db/layer";
import { ContextSchema } from "./lib/context";
import type { PluginsClient } from "./lib/plugins-client.gen";
import { BridgeStore, bridgeStoreLayer } from "./services/store";

/**
 * Metered-connectors bridge.
 *
 * Owns ONLY the OutLayer side of the demo: reading the agent's Agent Connect
 * budget, topping up the OutLayer payment key from the agent's balance, and
 * metered connector calls. Agent account management lives in the
 * `agent-connect` plugin — no duplicated owner intents here.
 *
 * The Agent API base URL is a variable (not a constant), so the bridge can run
 * against a local deployment or the vendored API's deterministic test harness
 * for offline automation. OutLayer has no local deployment — point
 * `outlayerApiUrl` at testnet for free trial runs.
 */

const AGENT_API_DEFAULT = "https://api.agentsonintents.com";
const OUTLAYER_API_DEFAULT = "https://api.outlayer.ai";

type UpstreamError = ORPCError<
  "BAD_REQUEST" | "NOT_FOUND" | "CONNECTION_ERROR" | "INTERNAL_SERVER_ERROR",
  unknown
>;

const mapUpstreamError =
  (what: string) =>
  (error: unknown): UpstreamError => {
    if (error instanceof ORPCError) return error as UpstreamError;
    const detail =
      error instanceof Error ? error.message : typeof error === "string" ? error : "unknown error";
    return new ORPCError("CONNECTION_ERROR", { message: `${what} failed: ${detail}` });
  };

class ConnectorConfig extends Context.Service<ConnectorConfig, ConnectorConfigShape>()(
  "connectors/ConnectorConfig",
) {}

interface ConnectorConfigShape {
  agentApiKey: string | null;
  agentApiBaseUrl: string;
  outlayerApiUrl: string;
}

const fetchJson = (url: string, init?: RequestInit) =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(url, init);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : (JSON.stringify(body) ?? "");
        throw new ORPCError("BAD_REQUEST", {
          message: `${res.status} ${detail}`,
          data: { status: res.status, body },
        });
      }
      return body;
    },
    catch: (error) => {
      if (error instanceof ORPCError) return error as UpstreamError;
      return mapUpstreamError("Upstream call")(error);
    },
  });

/** Non-throwing fetch for flows that branch on the upstream's status/reason. */
const fetchLoose = (url: string, init?: RequestInit) =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(url, init);
      const body = await res.json().catch(() => null);
      return { status: res.status, body: body as unknown };
    },
    catch: mapUpstreamError("Upstream call"),
  });

type PaymentKeySource = "trial" | "funded" | "none";

interface ClaimedKey {
  paymentKey: string | null;
  source: PaymentKeySource;
}

const TERMINAL_TRIAL_REASONS = new Set([
  "trial_window_closed",
  "trial_disabled",
  "trial_unavailable",
]);

/**
 * Trial first (`POST /trial-key`: 50 free calls in the wallet's first week),
 * then a re-read when it was already claimed, otherwise nothing — a funded
 * key is created on demand by the call path.
 */
const claimTrialKey = (
  outlayerApiUrl: string,
  walletApiKey: string,
): Effect.Effect<ClaimedKey, UpstreamError> =>
  Effect.gen(function* () {
    const claimed = yield* fetchLoose(`${outlayerApiUrl}/trial-key`, {
      headers: { Authorization: `Bearer ${walletApiKey}` },
    });
    const claimedBody = claimed.body as { payment_key?: string } | null;
    if (claimed.status === 200 && claimedBody?.payment_key) {
      return { paymentKey: claimedBody.payment_key, source: "trial" as const };
    }

    const reason =
      claimed.body && typeof claimed.body === "object" && "reason" in claimed.body
        ? String((claimed.body as { reason: unknown }).reason)
        : null;
    if (claimed.status === 409 && reason === "trial_already_claimed") {
      const existing = yield* fetchLoose(`${outlayerApiUrl}/wallet/v1/payment-key`, {
        headers: { Authorization: `Bearer ${walletApiKey}` },
      });
      const existingBody = existing.body as { payment_key?: string } | null;
      if (existing.status === 200 && existingBody?.payment_key) {
        return { paymentKey: existingBody.payment_key, source: "trial" as const };
      }
      return { paymentKey: null, source: "none" };
    }
    if (
      (claimed.status === 403 || claimed.status === 404) &&
      reason &&
      TERMINAL_TRIAL_REASONS.has(reason)
    ) {
      return { paymentKey: null, source: "none" };
    }
    if (claimed.status === 503) {
      return { paymentKey: null, source: "none" };
    }
    yield* Effect.logWarning(
      `[connectors] trial claim refused (${claimed.status} ${reason ?? "?"}) — continuing without a key`,
    );
    return { paymentKey: null, source: "none" };
  });

const DEFAULT_KEY_DEPOSIT_USDC = "0.25";

const createFundedKey = (
  outlayerApiUrl: string,
  walletApiKey: string,
  initialDepositUsdc?: string,
): Effect.Effect<ClaimedKey, UpstreamError> =>
  Effect.gen(function* () {
    const result = (yield* fetchJson(`${outlayerApiUrl}/wallet/v1/create-payment-key`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${walletApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initial_deposit_usdc: initialDepositUsdc ?? DEFAULT_KEY_DEPOSIT_USDC,
      }),
    })) as { payment_key?: string; paymentKey?: string; nonce?: number };
    const paymentKey = result.payment_key ?? result.paymentKey ?? "";
    if (!paymentKey) {
      return yield* Effect.fail(
        new ORPCError("BAD_REQUEST", {
          message:
            "OutLayer payment key creation returned no key — if the error says the outcome is unknown, the key may still exist funded; check GET /public/payment-keys before retrying (a retry mints a NEW key)",
        }),
      );
    }
    return { paymentKey, source: "funded" as const };
  });

export default createPlugin.withPlugins<PluginsClient>()({
  variables: z.object({
    agentApiBaseUrl: z
      .string()
      .default(AGENT_API_DEFAULT)
      .describe("NEAR Intents Agent API origin — point at a local deployment for offline runs"),
    outlayerApiUrl: z
      .string()
      .default(OUTLAYER_API_DEFAULT)
      .describe("OutLayer API origin (mainnet or testnet)"),
  }),

  secrets: z.object({
    NEAR_INTENTS_AGENT_API_KEY: z
      .string()
      .optional()
      .describe("Partner API key (naa_…) for Agent Connect reads and transfers"),
    CONNECTORS_DATABASE_URL: z
      .string()
      .default("pglite:.bos/connectors/:memory:")
      .describe("Database connection string. Use pglite: for local, postgres:// for production."),
  }),

  context: ContextSchema,

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      yield* Effect.logInfo("[connectors] Initialized");
      return Layer.mergeAll(
        Layer.succeed(ConnectorConfig, {
          agentApiKey: config.secrets.NEAR_INTENTS_AGENT_API_KEY ?? null,
          agentApiBaseUrl: config.variables.agentApiBaseUrl,
          outlayerApiUrl: config.variables.outlayerApiUrl,
        }),
        bridgeStoreLayer.pipe(Layer.provide(DatabaseLive(config.secrets.CONNECTORS_DATABASE_URL))),
      );
    }),

  createRouter: (builder, plugins) => {
    const requireUser = (userId: string | null | undefined): string => {
      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
      }
      return userId;
    };

    return {
      agentBudget: builder.agentBudget.effect(function* ({ input, context }) {
        requireUser(context.userId);
        const config = yield* ConnectorConfig;
        if (!config.agentApiKey) {
          return yield* Effect.fail(
            new ORPCError("BAD_REQUEST", {
              message:
                "NEAR_INTENTS_AGENT_API_KEY not configured — the bridge is dormant without it",
            }),
          );
        }

        const policy = yield* fetchJson(
          `${config.agentApiBaseUrl}/v1/agents/${encodeURIComponent(input.agentId)}/policy`,
          { headers: { "X-API-Key": config.agentApiKey } },
        );

        const usage =
          (policy as { usage?: { budget?: Record<string, Record<string, string> | null> } })?.usage
            ?.budget ?? {};
        const windowFor = (name: "daily" | "weekly" | "monthly") => {
          const w = usage[name];
          return w
            ? {
                limitUsd: w.limit_usd ?? null,
                spentUsd: w.spent_usd ?? null,
                remainingUsd: w.remaining_usd ?? null,
                resetsAt: w.resets_at ?? null,
              }
            : null;
        };
        return {
          agentId: input.agentId,
          daily: windowFor("daily"),
          weekly: windowFor("weekly"),
          monthly: windowFor("monthly"),
        };
      }),

      agentTopup: builder.agentTopup.effect(function* ({ input, context }) {
        const userId = requireUser(context.userId);
        const config = yield* ConnectorConfig;
        if (!config.agentApiKey) {
          return yield* Effect.fail(
            new ORPCError("BAD_REQUEST", {
              message:
                "NEAR_INTENTS_AGENT_API_KEY not configured — the bridge is dormant without it",
            }),
          );
        }
        const store = yield* BridgeStore;

        const bridge = plugins["agent-connect"];
        if (!bridge) {
          return yield* Effect.fail(
            new ORPCError("CONNECTION_ERROR", {
              message:
                "agent-connect plugin is not loaded — the grant-resolved transfer is unavailable",
            }),
          );
        }

        const idempotencyKey = input.idempotencyKey ?? `topup-${input.agentId}-${Date.now()}`;
        const transfer = yield* Effect.tryPromise({
          try: () =>
            bridge.client({ userId }).agentTransfer({
              agentId: input.agentId,
              recipient: input.outlayerWalletId,
              amountNear: input.amountNear,
              idempotencyKey,
            }),
          catch: mapUpstreamError("Agent Connect transfer"),
        });

        yield* store.record({
          userId,
          agentId: input.agentId,
          kind: "topup",
          usdCents: "0",
          connector: null,
          operation: null,
        });

        return {
          correlationId: transfer.correlationId ?? "",
          status: transfer.status ?? "submitted",
          amountNear: input.amountNear,
          to: input.outlayerWalletId,
        };
      }),

      outlayerWalletSetup: builder.outlayerWalletSetup.effect(function* ({ input, context }) {
        const userId = requireUser(context.userId);
        const config = yield* ConnectorConfig;
        const store = yield* BridgeStore;

        const existing = yield* store.getWallet(userId, input.agentId);
        if (existing) {
          return {
            created: false,
            walletId: existing.walletId,
            nearAccountId: existing.nearAccountId,
            keySource:
              existing.paymentKeySource === "trial" ? ("trial" as const) : ("none" as const),
          };
        }

        const registered = (yield* fetchJson(`${config.outlayerApiUrl}/register`, {
          method: "POST",
        })) as {
          api_key?: string;
          wallet_id?: string;
          near_account_id?: string;
        };
        if (!registered.api_key || !registered.near_account_id) {
          return yield* Effect.fail(
            new ORPCError("BAD_REQUEST", {
              message: "OutLayer wallet registration returned no key or address",
            }),
          );
        }

        const claimed = yield* claimTrialKey(config.outlayerApiUrl, registered.api_key);

        yield* store.upsertWallet({
          userId,
          agentId: input.agentId,
          walletApiKey: registered.api_key,
          walletId: registered.wallet_id ?? null,
          nearAccountId: registered.near_account_id,
        });
        if (claimed.paymentKey) {
          yield* store.setPaymentKey(userId, input.agentId, claimed.paymentKey, claimed.source);
        }

        return {
          created: true,
          walletId: registered.wallet_id ?? null,
          nearAccountId: registered.near_account_id,
          keySource: claimed.source === "trial" ? ("trial" as const) : ("none" as const),
        };
      }),

      outlayerWalletConnect: builder.outlayerWalletConnect.effect(function* ({ input, context }) {
        const userId = requireUser(context.userId);
        const config = yield* ConnectorConfig;
        const store = yield* BridgeStore;

        const info = (yield* fetchJson(`${config.outlayerApiUrl}/wallet/v1/address?chain=near`, {
          headers: { Authorization: `Bearer ${input.walletApiKey}` },
        })) as { wallet_id?: string; address?: string };

        if (!info.address) {
          return yield* Effect.fail(
            new ORPCError("BAD_REQUEST", {
              message: "OutLayer wallet address lookup returned no address — check the wk_ key",
            }),
          );
        }

        const claimed = yield* claimTrialKey(config.outlayerApiUrl, input.walletApiKey);

        const row = yield* store.upsertWallet({
          userId,
          agentId: input.agentId,
          walletApiKey: input.walletApiKey,
          walletId: info.wallet_id ?? null,
          nearAccountId: info.address,
        });
        if (claimed.paymentKey) {
          yield* store.setPaymentKey(userId, input.agentId, claimed.paymentKey, claimed.source);
        }

        return {
          walletId: row.walletId,
          nearAccountId: row.nearAccountId,
          keySource: claimed.source,
        };
      }),

      bridgeInfo: builder.bridgeInfo.effect(function* ({ input, context }) {
        const userId = requireUser(context.userId);
        const store = yield* BridgeStore;

        const row = yield* store.getWallet(userId, input.agentId);
        return {
          wallet: row
            ? {
                nearAccountId: row.nearAccountId,
                walletId: row.walletId,
                paymentKey: row.paymentKey,
                keySource: row.paymentKeySource,
                connectedAt: row.connectedAt.toISOString(),
              }
            : null,
        };
      }),

      recordWalletTopup: builder.recordWalletTopup.effect(function* ({ input, context }) {
        const userId = requireUser(context.userId);
        const store = yield* BridgeStore;

        const id = yield* store.record({
          userId,
          agentId: input.agentId,
          kind: "topup",
          usdCents: "0",
          connector: null,
          operation: null,
        });
        return { id };
      }),

      outlayerPaymentKey: builder.outlayerPaymentKey.effect(function* ({ input, context }) {
        const config = yield* ConnectorConfig;
        const store = yield* BridgeStore;
        const userId = context.userId ?? null;

        let walletApiKey = input.walletApiKey ?? null;
        if (!walletApiKey && userId && input.agentId) {
          const row = yield* store.getWallet(userId, input.agentId);
          walletApiKey = row?.walletApiKey ?? null;
        }
        if (!walletApiKey) {
          return yield* Effect.fail(
            new ORPCError("BAD_REQUEST", {
              message:
                "No OutLayer wallet API key — connect the OutLayer wallet first or pass walletApiKey",
            }),
          );
        }

        const result = (yield* fetchJson(`${config.outlayerApiUrl}/wallet/v1/create-payment-key`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${walletApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...(input.initialDepositUsdc ? { initial_deposit_usdc: input.initialDepositUsdc } : {}),
            ...(input.initialDepositNear ? { initial_deposit_near: input.initialDepositNear } : {}),
          }),
        })) as { payment_key?: string; paymentKey?: string; nonce?: number };

        const paymentKey = result.payment_key ?? result.paymentKey ?? "";
        if (userId && input.agentId && paymentKey) {
          yield* store.setPaymentKey(userId, input.agentId, paymentKey, "funded");
        }

        return {
          paymentKey,
          nonce: result.nonce ?? 1,
        };
      }),

      outlayerCall: builder.outlayerCall.effect(function* ({ input, context }) {
        const userId = requireUser(context.userId);
        const config = yield* ConnectorConfig;
        const store = yield* BridgeStore;

        const walletId = input.walletId ?? null;
        let paymentKey = input.paymentKey ?? null;
        let keySource: string | null = paymentKey ? "explicit" : null;

        const row = yield* store.getWallet(userId, input.agentId);
        if (!row && !paymentKey) {
          return yield* Effect.fail(
            new ORPCError("BAD_REQUEST", {
              message: "No OutLayer wallet connected — set up the wallet first",
            }),
          );
        }
        paymentKey = paymentKey ?? row?.paymentKey ?? null;
        if (!paymentKey) {
          if (!row) {
            return yield* Effect.fail(
              new ORPCError("BAD_REQUEST", {
                message: "No OutLayer wallet connected — set up the wallet first",
              }),
            );
          }
          const created = yield* createFundedKey(config.outlayerApiUrl, row.walletApiKey);
          yield* store.setPaymentKey(userId, input.agentId, created.paymentKey!, created.source);
          paymentKey = created.paymentKey;
          keySource = created.source;
        } else {
          keySource = keySource ?? row?.paymentKeySource ?? null;
        }

        // The credential shape follows the project: the curated namespace
        // reads the wallet's own agent-secret row (X-Use-Owner-Secret: 1, no
        // secrets_ref); an ordinary project names the owner's row instead —
        // account_id and profile are the wallet's own address unless the row
        // is stored under another label.
        const project = input.connector.includes("/")
          ? input.connector
          : `connectors.outlayer.near/${input.connector}`;
        const curated = project.startsWith("connectors.outlayer.");

        let secretsRef: { accountId: string; profile: string } | null;
        if (curated) {
          secretsRef = null;
        } else if (input.secretsRef) {
          secretsRef = input.secretsRef;
        } else {
          const owner = row?.nearAccountId ?? null;
          if (!owner) {
            return yield* Effect.fail(
              new ORPCError("BAD_REQUEST", {
                message:
                  "No credential row reference — pass secretsRef (the account/profile the row is stored under)",
              }),
            );
          }
          secretsRef = { accountId: owner, profile: owner };
        }

        const result = (yield* fetchJson(
          `${config.outlayerApiUrl}/call/${project.split("/").map(encodeURIComponent).join("/")}`,
          {
            method: "POST",
            headers: {
              "X-Payment-Key": paymentKey ?? "",
              ...(walletId ? { "X-Wallet-Id": walletId } : {}),
              ...(curated ? { "X-Use-Owner-Secret": "1" } : {}),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: { ...input.input, operation: input.operation },
              ...(curated || !secretsRef
                ? {}
                : {
                    secrets_ref: {
                      account_id: secretsRef.accountId,
                      profile: secretsRef.profile,
                    },
                  }),
            }),
          },
        )) as {
          call_id?: string;
          status?: string;
          compute_cost?: string | null;
          output?: Record<string, unknown> | null;
          error?: string | null;
        };

        yield* store.record({
          userId,
          agentId: input.agentId,
          kind: "call",
          usdCents: "0",
          outlayerCostMicros: result.compute_cost ?? null,
          connector: input.connector,
          operation: input.operation,
        });

        return {
          callId: result.call_id ?? "",
          status: result.status ?? "",
          keySource,
          computeCost: result.compute_cost ?? null,
          output: result.output ?? null,
          error: result.error ?? null,
        };
      }),

      events: builder.events.effect(function* ({ input, context }) {
        const userId = requireUser(context.userId);
        const store = yield* BridgeStore;
        const rows = yield* store.list(userId, input.agentId, input.limit ?? 50);
        return {
          data: rows.map((row) => ({
            id: row.id,
            kind: row.kind,
            agentId: row.agentId,
            usdCents: row.usdCents,
            outlayerCostMicros: row.outlayerCostMicros,
            balanceRemainingUsd: row.balanceRemainingUsd,
            outlayerKeyRemaining: row.outlayerKeyRemaining,
            connector: row.connector,
            operation: row.operation,
            createdAt: row.createdAt.toISOString(),
          })),
        };
      }),
    };
  },
});
