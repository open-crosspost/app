import { ORPCError } from "@orpc/server";
import { Effect } from "effect";
import { XPOST_BUY_URL } from "../contract";
import {
  clampTiers,
  formatThreshold,
  nearPerXpost,
  parseCsvNumbers,
  tierFor,
  tierThresholds,
  toHumanUnits,
  usdPerNear,
  xpostPriceUsd,
} from "../lib/gate-math";
import { mapUpstreamError, type UpstreamError } from "../lib/upstream";
import type { GateConfigRow, GateConfigStoreShape, GateStoreError } from "./gate-config";

/**
 * The XPOST admission gate: resolve tier thresholds (singleton DB row → the
 * plugin-variable ladder), enforce Tier 1 on app-paid dispatch fail-closed,
 * and refresh the thresholds daily from the Ref pools — XPOST/wNEAR plus the
 * deep wNEAR/USDT leg (there is no deep wNEAR/USDC pool; USDT is the USD
 * reference). A failed refresh keeps yesterday's row; an admin's manual pin
 * (source: "manual") holds until an admin forces a refresh.
 */

const WNEAR_TOKEN_ID = "wrap.near";

export interface GateDeps {
  nearRpcUrl: string;
  xpostTokenContract: string;
  XPOST_GATE_ENABLED: boolean;
  XPOST_TIER_BALANCES: string;
  XPOST_TIER_TARGETS_USD: string;
  REF_CONTRACT_ID: string;
  REF_XPOST_NEAR_POOL_ID: string;
  REF_NEAR_USD_POOL_ID: string;
  REF_NEAR_USD_TOKEN_ID: string;
}

export interface ResolvedGate {
  enabled: boolean;
  tier1: number;
  tier2: number;
  tier3: number;
  source: "defaults" | "auto" | "manual";
  priceUsd: string | null;
  refreshedAt: string | null;
}

/** NEAR JSON-RPC view-call against a contract. */
const nearViewCall = (
  rpcUrl: string,
  contractId: string,
  methodName: string,
  args: Record<string, unknown>,
): Effect.Effect<unknown, UpstreamError> =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "xpost-gate",
          method: "query",
          params: {
            request_type: "call_function",
            account_id: contractId,
            method_name: methodName,
            args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
            finality: "optimistic",
          },
        }),
      });
      const body = (await res.json()) as {
        error?: { message?: string };
        result?: { result?: unknown };
      };
      if (body.error) {
        throw new Error(body.error.message ?? "NEAR RPC error");
      }
      return body.result?.result;
    },
    catch: mapUpstreamError("XPOST gate read"),
  });

/**
 * `call_function` answers the JSON text of the view's return value — as a
 * legacy byte array or (newer nodes) a plain string. Parse one level when the
 * text decodes to a string.
 */
export const decodeViewResult = (raw: unknown): string => {
  const text =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? String.fromCharCode(...(raw as number[]))
        : (() => {
            throw new Error("unrecognized NEAR RPC view result shape");
          })();
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "string" ? parsed : text;
  } catch {
    return text;
  }
};

let xpostDecimals: Promise<number> | null = null;

export const loadXpostDecimals = (deps: GateDeps): Promise<number> => {
  if (!xpostDecimals) {
    xpostDecimals = Effect.runPromise(
      nearViewCall(deps.nearRpcUrl, deps.xpostTokenContract, "ft_metadata", {}).pipe(
        Effect.map((raw) => {
          const meta = JSON.parse(decodeViewResult(raw)) as { decimals?: number };
          if (typeof meta.decimals !== "number") throw new Error("ft_metadata had no decimals");
          return meta.decimals;
        }),
      ),
    ).catch((error) => {
      xpostDecimals = null;
      throw error;
    });
  }
  return xpostDecimals;
};

export const xpostRawBalance = (
  deps: GateDeps,
  accountId: string,
): Effect.Effect<bigint, UpstreamError | Error> =>
  Effect.gen(function* () {
    const balanceRaw = yield* nearViewCall(
      deps.nearRpcUrl,
      deps.xpostTokenContract,
      "ft_balance_of",
      { account_id: accountId },
    ).pipe(Effect.map(decodeViewResult));
    return BigInt(balanceRaw || "0");
  });

export const resolveGate = (
  deps: GateDeps,
  store: GateConfigStoreShape,
): Effect.Effect<ResolvedGate, GateStoreError> =>
  Effect.gen(function* () {
    const row = yield* store.get();
    const thresholds = row
      ? [Number(row.tier1Balance), Number(row.tier2Balance), Number(row.tier3Balance)]
      : parseCsvNumbers(deps.XPOST_TIER_BALANCES);
    return {
      enabled: deps.XPOST_GATE_ENABLED && (thresholds[0] ?? 0) > 0,
      tier1: thresholds[0] ?? 0,
      tier2: thresholds[1] ?? 0,
      tier3: thresholds[2] ?? 0,
      source: row?.source === "auto" || row?.source === "manual" ? row.source : "defaults",
      priceUsd: row?.priceUsd ?? null,
      refreshedAt: row?.refreshedAt ? row.refreshedAt.toISOString() : null,
    };
  });

interface RefPool {
  token_account_ids: string[];
  amounts: string[];
}

const refPool = (deps: GateDeps, poolId: string): Effect.Effect<RefPool, UpstreamError | Error> =>
  nearViewCall(deps.nearRpcUrl, deps.REF_CONTRACT_ID, "get_pool", { pool_id: poolId }).pipe(
    Effect.map((raw) => {
      const pool = JSON.parse(decodeViewResult(raw)) as RefPool;
      if (!Array.isArray(pool.token_account_ids) || !Array.isArray(pool.amounts)) {
        throw new Error(`Ref pool ${poolId} returned an unexpected shape`);
      }
      return pool;
    }),
  );

const amountFor = (pool: RefPool, tokenId: string): string => {
  const index = pool.token_account_ids.indexOf(tokenId);
  if (index === -1) throw new Error(`Ref pool does not list ${tokenId}`);
  return pool.amounts[index]!;
};

const otherAmount = (pool: RefPool, tokenId: string): string =>
  pool.amounts[pool.token_account_ids.length - 1 - pool.token_account_ids.indexOf(tokenId)]!;

export const refreshGateConfig = (
  deps: GateDeps,
  store: GateConfigStoreShape,
  options: { force?: boolean } = {},
): Effect.Effect<GateConfigRow, GateStoreError | UpstreamError | Error> =>
  Effect.gen(function* () {
    const prev = yield* store.get();
    if (prev?.source === "manual" && !options.force) {
      return prev;
    }

    const xpool = yield* refPool(deps, deps.REF_XPOST_NEAR_POOL_ID);
    const usdPool = yield* refPool(deps, deps.REF_NEAR_USD_POOL_ID);
    const wnearInXpool = amountFor(xpool, WNEAR_TOKEN_ID);
    const xpostRaw = otherAmount(xpool, WNEAR_TOKEN_ID);
    const usdtRaw = amountFor(usdPool, deps.REF_NEAR_USD_TOKEN_ID);
    const wnearInUsdPool = otherAmount(usdPool, deps.REF_NEAR_USD_TOKEN_ID);

    const price = xpostPriceUsd(
      nearPerXpost(wnearInXpool, xpostRaw),
      usdPerNear(usdtRaw, wnearInUsdPool),
    );
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Ref pools produced a non-positive XPOST price");
    }

    const computed = tierThresholds(parseCsvNumbers(deps.XPOST_TIER_TARGETS_USD), price);
    const previous = prev
      ? [Number(prev.tier1Balance), Number(prev.tier2Balance), Number(prev.tier3Balance)]
      : parseCsvNumbers(deps.XPOST_TIER_BALANCES);
    const tiers = clampTiers(computed, previous);

    return yield* store.set({
      tier1Balance: formatThreshold(tiers[0]!),
      tier2Balance: formatThreshold(tiers[1]!),
      tier3Balance: formatThreshold(tiers[2]!),
      priceUsd: String(price),
      source: "auto",
    });
  });

/**
 * Tier 1 admission: app-paid dispatch requires the caller's NEAR account to
 * hold the resolved minimum. Off when the gate is disabled or the minimum is
 * 0. Fail-closed — an unverifiable balance refuses the dispatch (it costs the
 * caller nothing; the call never reaches OutLayer).
 */
export const enforceXpostGate = (
  deps: GateDeps,
  gate: ResolvedGate,
  nearAccountId: string | null | undefined,
): Effect.Effect<void, UpstreamError | Error> =>
  Effect.gen(function* () {
    if (!gate.enabled) return;
    const minimum = formatThreshold(gate.tier1);
    if (!nearAccountId) {
      return yield* Effect.fail(
        new ORPCError("GATE_REFUSED", {
          message:
            "XPOST gate requires a connected NEAR account — sign in with your NEAR wallet first",
          data: {
            reason: "no_near_account",
            minimum,
            balance: null,
            buyUrl: XPOST_BUY_URL,
          },
        }),
      );
    }
    const decimals = yield* Effect.tryPromise({
      try: () => loadXpostDecimals(deps),
      catch: () => new Error("XPOST metadata unavailable"),
    });
    const balance = yield* xpostRawBalance(deps, nearAccountId);
    const minimumRaw = BigInt(Math.ceil(gate.tier1 * 10 ** decimals));
    if (balance < minimumRaw) {
      return yield* Effect.fail(
        new ORPCError("GATE_REFUSED", {
          message: `XPOST balance too low — hold at least ${minimum} XPOST to post on the app's key, or bring your own OutLayer wallet`,
          data: {
            reason: "balance_too_low",
            minimum,
            balance: toHumanUnits(balance, decimals),
            buyUrl: XPOST_BUY_URL,
          },
        }),
      );
    }
  });

export const callerGateStatus = (
  deps: GateDeps,
  gate: ResolvedGate,
  nearAccountId: string | null | undefined,
): Effect.Effect<{ balance: string | null; tier: number | null }, never> =>
  Effect.gen(function* () {
    if (!nearAccountId) return { balance: null, tier: null };
    const reading = Effect.gen(function* () {
      const decimals = yield* Effect.tryPromise({
        try: () => loadXpostDecimals(deps),
        catch: () => new Error("XPOST metadata unavailable"),
      });
      const balance = yield* xpostRawBalance(deps, nearAccountId);
      return {
        balance: toHumanUnits(balance, decimals),
        tier: tierFor(balance, decimals, [gate.tier1, gate.tier2, gate.tier3]),
      };
    });
    const exit = yield* Effect.exit(reading);
    return exit._tag === "Success" ? exit.value : { balance: null, tier: null };
  });
