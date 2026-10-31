import "@orpc/openapi/extensions/route";
import { oc } from "@orpc/contract";
import { BAD_REQUEST, CONNECTION_ERROR, FORBIDDEN, UNAUTHORIZED } from "every-plugin/errors";
import { z } from "zod";

/**
 * Metered-connectors bridge contract.
 *
 * This plugin owns ONLY the OutLayer side of the demo: reading the agent's
 * Agent Connect budget, topping up the OutLayer payment key from the agent's
 * balance, and metered connector calls. Agent account management lives in the
 * `agent-connect` plugin — no duplicated owner intents here.
 */

/**
 * Where users buy the XPOST gate token — same link the site footer shows.
 */
export const XPOST_BUY_URL = "https://meme.cooking/meme/1634";

export const GateRefusalDataSchema = z.object({
  reason: z.enum(["no_near_account", "balance_too_low"]),
  minimum: z.string().describe("Tier-1 minimum in human XPOST units"),
  balance: z
    .string()
    .nullable()
    .describe("The caller's XPOST balance in human units (null when no NEAR account)"),
  buyUrl: z.string().describe("Where to acquire XPOST"),
});

export type GateRefusalData = z.infer<typeof GateRefusalDataSchema>;

/**
 * The XPOST admission gate refused app-paid dispatch before any spend — the
 * call is free, the payload explains the remedy (buy XPOST, sign in, or BYO).
 */
export const GATE_REFUSED = {
  status: 402,
  data: GateRefusalDataSchema,
} as const;

const PolicyWindowSchema = z
  .object({
    limitUsd: z.string().nullable(),
    spentUsd: z.string().nullable(),
    remainingUsd: z.string().nullable(),
    resetsAt: z.string().nullable(),
  })
  .nullable();

const BridgeEventSchema = z.object({
  id: z.string(),
  kind: z.string(),
  agentId: z.string(),
  usdCents: z.string(),
  outlayerCostMicros: z.string().nullable(),
  balanceRemainingUsd: z.string().nullable(),
  outlayerKeyRemaining: z.string().nullable(),
  connector: z.string().nullable(),
  operation: z.string().nullable(),
  createdAt: z.string(),
});

const SpendWindowSchema = z.object({
  posts: z.number().int().min(0),
  usdMicros: z.string().describe("Sum of OutLayer compute costs in USD micros"),
});

const SponsorDailyPointSchema = z.object({
  date: z.string().describe("UTC date (YYYY-MM-DD)"),
  posts: z.number().int().min(0),
  usdMicros: z.string(),
});

export const contract = oc.router({
  agentBudget: oc
    .route({
      method: "GET",
      path: "/agent/budget",
      summary: "Read the agent's Agent Connect budget and remaining balance",
      description:
        "Returns the owner-signed policy budget (daily/weekly/monthly USD) and remaining spend for the given agent.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z.string().min(1).describe("Agent account id"),
      }),
    )
    .output(
      z.object({
        agentId: z.string(),
        daily: PolicyWindowSchema,
        weekly: PolicyWindowSchema,
        monthly: PolicyWindowSchema,
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST, CONNECTION_ERROR }),

  agentTopup: oc
    .route({
      method: "POST",
      path: "/agent/topup",
      summary: "Transfer funds from the agent to an OutLayer wallet (top-up)",
      description:
        "Executes an Agent Connect `transfer` from the agent account to the OutLayer wallet, funding its payment key for connector calls. The live grant's sealed token is resolved server-side and never reaches the browser. Charged against the agent's owner-signed USD budget.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z.string().min(1).describe("Agent account id"),
        outlayerWalletId: z
          .string()
          .min(1)
          .describe("OutLayer wallet near_account_id (64-char implicit)"),
        amountNear: z.string().min(1).describe("Amount in yoctoNEAR to transfer"),
        idempotencyKey: z.string().min(8).max(128).optional(),
      }),
    )
    .output(
      z.object({
        correlationId: z.string(),
        status: z.string(),
        amountNear: z.string(),
        to: z.string(),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST, CONNECTION_ERROR }),

  outlayerWalletSetup: oc
    .route({
      method: "POST",
      path: "/outlayer/wallet/setup",
      summary: "Create an OutLayer wallet and claim its trial key",
      description:
        "Idempotent: registers a fresh OutLayer custody wallet (one unauthenticated POST — the wk_ key never leaves the server), immediately claims the 50-call free trial key, and stores everything for the agent. Does nothing when a wallet is already connected.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z.string().min(1).describe("Agent account id"),
      }),
    )
    .output(
      z.object({
        created: z.boolean(),
        walletId: z.string().nullable(),
        nearAccountId: z.string(),
        keySource: z.enum(["trial", "none"]),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST, CONNECTION_ERROR }),

  outlayerWalletConnect: oc
    .route({
      method: "POST",
      path: "/outlayer/wallet/connect",
      summary: "Connect the OutLayer wallet for an agent",
      description:
        "Validates the OutLayer wallet API key (wk_…) against the OutLayer API and stores the resolved NEAR address for the agent, so top-ups and payment keys autofill.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z.string().min(1).describe("Agent account id"),
        walletApiKey: z.string().min(1).describe("OutLayer wallet API key (wk_…)"),
      }),
    )
    .output(
      z.object({
        walletId: z.string().nullable(),
        nearAccountId: z.string(),
        keySource: z.enum(["trial", "funded", "none"]),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST, CONNECTION_ERROR }),

  bridgeInfo: oc
    .route({
      method: "GET",
      path: "/agent/bridge-info",
      summary: "Read the agent's connected OutLayer wallet state",
      description:
        "Returns the stored OutLayer wallet connection for the caller and agent — near account id, wallet id, and the last created payment key.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z.string().min(1).describe("Agent account id"),
      }),
    )
    .output(
      z.object({
        wallet: z
          .object({
            nearAccountId: z.string(),
            walletId: z.string().nullable(),
            paymentKey: z.string().nullable(),
            keySource: z.string().nullable(),
            connectedAt: z.string(),
          })
          .nullable(),
      }),
    )
    .errors({ UNAUTHORIZED, CONNECTION_ERROR }),

  recordWalletTopup: oc
    .route({
      method: "POST",
      path: "/agent/wallet-topup",
      summary: "Record a direct wallet-signed top-up",
      description:
        "Records a NEAR transfer the owner signed in their own browser wallet straight to the OutLayer wallet address, so the event log shows both funding paths.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z.string().min(1).describe("Agent account id"),
        txHash: z.string().min(1).describe("NEAR transaction hash of the wallet transfer"),
      }),
    )
    .output(z.object({ id: z.string() }))
    .errors({ UNAUTHORIZED, CONNECTION_ERROR }),

  outlayerPaymentKey: oc
    .route({
      method: "POST",
      path: "/outlayer/payment-key",
      summary: "Create and fund an OutLayer payment key",
      description:
        "Creates a funded OutLayer payment key from the wallet's USDC or NEAR balance and stores it server-side — the key string never leaves the server.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Agent account id — enables the stored wallet key and persists the created payment key",
          ),
        walletApiKey: z
          .string()
          .optional()
          .describe("OutLayer wallet API key (wk_…); falls back to the connected wallet"),
        initialDepositUsdc: z.string().optional().describe("Initial USDC deposit (e.g. '2.00')"),
        initialDepositNear: z.string().optional().describe("Initial NEAR deposit (e.g. '1.0')"),
      }),
    )
    .output(
      z.object({
        nonce: z.number(),
        stored: z.boolean(),
        keySource: z.string().nullable(),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST, CONNECTION_ERROR }),

  outlayerAppWalletAttach: oc
    .route({
      method: "POST",
      path: "/outlayer/app-wallet/attach",
      summary: "Attach the caller's credential row to the app-managed OutLayer wallet",
      description:
        "Records that the caller's connector credential row (stored by the api under rowProfile) lives on the app-managed OutLayer wallet. Dispatch then presents the app's shared payment key and resolves the row via secrets_ref — the user never holds an OutLayer key.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z.string().min(1).describe("Agent account id (for event attribution)"),
        rowProfile: z
          .string()
          .min(1)
          .max(64)
          .describe("The profile label the caller's credential row is stored under"),
      }),
    )
    .output(
      z.object({
        attached: z.boolean(),
        walletAccountId: z.string(),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST, CONNECTION_ERROR }),

  outlayerCall: oc
    .route({
      method: "POST",
      path: "/outlayer/call",
      summary: "Invoke an OutLayer connector operation (metered per call)",
      description:
        "Calls an OutLayer connector (e.g. gmail.send_email) using a payment key. Each call is metered against the key's balance — visible as money going down in the UI.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        walletId: z
          .string()
          .optional()
          .describe(
            "OutLayer wallet id from GET /wallet/v1/address — sent verbatim as X-Wallet-Id; omit unless the connector signs or moves funds",
          ),
        paymentKey: z
          .string()
          .optional()
          .describe(
            "OutLayer payment key; defaults to the connected wallet's key, created on demand",
          ),
        agentId: z.string().min(1).describe("Agent account id (for event attribution)"),
        connector: z
          .string()
          .min(1)
          .describe(
            "Connector id (e.g. gmail, x) or a full project id (owner/name) — a bare id targets the connectors.outlayer.near namespace",
          ),
        operation: z.string().min(1).describe("Connector operation (e.g. status, send_email)"),
        secretsRef: z
          .object({
            accountId: z.string().describe("Owner NEAR account id the row is stored under"),
            profile: z.string().describe("Connector profile id (the label chosen at store time)"),
          })
          .optional()
          .describe(
            "Owner's credential row for an ordinary (non-curated) project; on the curated namespace the wallet's own agent-secret row is read instead (X-Use-Owner-Secret)",
          ),
        input: z.record(z.string(), z.unknown()).describe("Connector operation input"),
      }),
    )
    .output(
      z.object({
        callId: z.string(),
        status: z.string(),
        keySource: z.string().nullable(),
        computeCost: z.string().nullable(),
        output: z.record(z.string(), z.unknown()).nullable(),
        error: z.string().nullable(),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST, CONNECTION_ERROR, GATE_REFUSED }),

  xpostGateStatus: oc
    .route({
      method: "GET",
      path: "/xpost/gate-status",
      summary: "Read the XPOST gate's tier thresholds and the caller's resolved tier",
      description:
        "Public: returns the gate state, the tier ladder (human XPOST units, dynamic via the daily Ref-pool refresh), and — when the caller has a NEAR account in session — their balance and resolved tier.",
      tags: ["Connectors Bridge"],
    })
    .input(z.object({}).optional())
    .output(
      z.object({
        enabled: z.boolean(),
        tier1: z.string(),
        tier2: z.string(),
        tier3: z.string(),
        source: z.string(),
        priceUsd: z.string().nullable(),
        refreshedAt: z.string().nullable(),
        caller: z.object({
          nearAccountId: z.string().nullable(),
          balance: z.string().nullable(),
          tier: z.number().nullable(),
        }),
      }),
    )
    .errors({ BAD_REQUEST, CONNECTION_ERROR }),

  xpostGateConfigSet: oc
    .route({
      method: "POST",
      path: "/xpost/gate-config",
      summary: "Pin the tier ladder by hand (admin)",
      description:
        "Writes the singleton gate_config row with source 'manual' — the daily refresh respects a manual pin until a forced refresh clears it.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        tier1: z.string().min(1).describe("Tier 1 minimum in human XPOST units"),
        tier2: z.string().min(1).describe("Tier 2 minimum in human XPOST units"),
        tier3: z.string().min(1).describe("Tier 3 minimum in human XPOST units"),
      }),
    )
    .output(
      z.object({
        tier1: z.string(),
        tier2: z.string(),
        tier3: z.string(),
        source: z.string(),
        priceUsd: z.string().nullable(),
        refreshedAt: z.string(),
      }),
    )
    .errors({ UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, CONNECTION_ERROR }),

  xpostGateConfigRefresh: oc
    .route({
      method: "POST",
      path: "/xpost/gate-config/refresh",
      summary: "Recompute the tier ladder from the Ref pools now (admin)",
      description:
        "Runs the same price refresh the daily daemon performs, forced — it overrides a manual pin. Fails without writing when the pool reads fail (fail-safe: previous thresholds are kept).",
      tags: ["Connectors Bridge"],
    })
    .output(
      z.object({
        tier1: z.string(),
        tier2: z.string(),
        tier3: z.string(),
        source: z.string(),
        priceUsd: z.string().nullable(),
        refreshedAt: z.string(),
      }),
    )
    .errors({ UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, CONNECTION_ERROR }),

  sponsorStats: oc
    .route({
      method: "GET",
      path: "/sponsor/stats",
      summary: "Public sponsorship totals",
      description:
        "Public: how many calls the app's shared payment key has sponsored and the metered compute cost so far — powers the 'the app pays for this' surfaces.",
      tags: ["Connectors Bridge"],
    })
    .input(z.object({}).optional())
    .output(
      z.object({
        sponsoredPosts: z.number().int().min(0),
        sponsoredUsdMicros: z.string(),
        lastSponsoredAt: z.string().nullable(),
      }),
    )
    .errors({ CONNECTION_ERROR }),

  appSponsorStatus: oc
    .route({
      method: "GET",
      path: "/sponsor/status",
      summary: "Sponsor wallet health and spend aggregates (admin)",
      description:
        "Admin: the app's shared OutLayer payment wallet (owner, key nonce, on-chain NEAR balance, best-effort remaining USD from OutLayer), sponsored-call spend windows, the 30-day daily series, and the low-balance warning thresholds.",
      tags: ["Connectors Bridge"],
    })
    .input(z.object({}).optional())
    .output(
      z.object({
        configured: z.boolean(),
        walletOwner: z.string().nullable(),
        keyNonce: z.string().nullable(),
        nearBalanceYocto: z.string().nullable(),
        nearBalanceNear: z.string().nullable(),
        outlayerKeyRemainingUsd: z.string().nullable(),
        windows: z.object({
          day: SpendWindowSchema,
          week: SpendWindowSchema,
          month: SpendWindowSchema,
        }),
        daily: z.array(SponsorDailyPointSchema),
        thresholds: z.object({
          warnNear: z.string().describe("NEAR balance floor (human units) — below this, warn"),
          warnUsd: z.string().describe("OutLayer key remaining USD floor — below this, warn"),
        }),
      }),
    )
    .errors({ UNAUTHORIZED, FORBIDDEN, CONNECTION_ERROR }),

  events: oc
    .route({
      method: "GET",
      path: "/events",
      summary: "List the agent's bridge events (top-ups and connector calls)",
      description: "Returns the action log of top-ups and connector calls.",
      tags: ["Connectors Bridge"],
    })
    .input(
      z.object({
        agentId: z.string().min(1).describe("Agent account id"),
        limit: z.number().min(1).max(100).default(50).optional(),
      }),
    )
    .output(z.object({ data: z.array(BridgeEventSchema) }))
    .errors({ UNAUTHORIZED, CONNECTION_ERROR }),
});

export type ContractType = typeof contract;
