import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { configureTestConfig, getPluginClient, mockUpstream } from "../setup";

/**
 * The dynamic tier engine: resolve (DB row → variable ladder), refresh from
 * the Ref pools (fail-safe, drift-capped, manual-pin aware), admin routes.
 * The RPC mocks mimic the wire: call_function results are byte arrays of the
 * view's JSON text, keyed by the invoked method.
 */

const viewResult = (value: unknown) =>
  Response.json({ result: { result: Array.from(Buffer.from(JSON.stringify(value))) } });

const rpcRequest = (init?: RequestInit) => {
  const body = JSON.parse(String(init?.body));
  return {
    method: body?.params?.method_name as string,
    args: JSON.parse(Buffer.from(body?.params?.args_base64 as string, "base64").toString()),
  };
};

/** Real mainnet reserves (2026-10-31): pools 6055 (XPOST/wNEAR) and 6063 (wNEAR/USDT). */
const REF_POOLS: Record<string, { token_account_ids: string[]; amounts: string[] }> = {
  "6055": {
    token_account_ids: ["xpost-1634.meme-cooking.near", "wrap.near"],
    amounts: ["429447747565504826319035822", "1141253874852192121438445978"],
  },
  "6063": {
    token_account_ids: ["wrap.near", "usdt.tether-token.near"],
    amounts: ["44538119249131654286979991715", "191062475812"],
  },
};

const rpcMock =
  (overrides?: (method: string, args: Record<string, unknown>) => Response | null) =>
  (url: string, init?: RequestInit) => {
    if (url.startsWith("https://rpc.test")) {
      const { method, args } = rpcRequest(init);
      if (method === "ft_metadata") return viewResult({ decimals: 18, symbol: "XPOST" });
      if (method === "ft_balance_of") return viewResult(BALANCE_FOR_TEST ?? "0");
      if (method === "get_pool") {
        const pool = REF_POOLS[String(args.pool_id)];
        if (!pool) return Response.json({ error: { message: "unknown pool" } }, { status: 500 });
        return viewResult(pool);
      }
      return overrides?.(method, args) ?? Response.json({}, { status: 500 });
    }
    return Response.json({ call_id: "call_gate", status: "completed" });
  };

let BALANCE_FOR_TEST: string | null = null;

describe("xpost tier engine", () => {
  beforeAll(() => {
    configureTestConfig({ variables: { XPOST_GATE_ENABLED: true } });
  });

  afterEach(() => {
    BALANCE_FOR_TEST = null;
    mockUpstream(() => Response.json({}));
  });

  it("reports the fallback ladder and an anonymous caller before any row exists", async () => {
    const restore = mockUpstream(rpcMock());
    try {
      const client = await getPluginClient();
      const status = await client.xpostGateStatus();
      expect(status.enabled).toBe(true);
      expect(status.source).toBe("defaults");
      expect(status.tier1).toBe("100000");
      expect(status.tier2).toBe("1000000");
      expect(status.tier3).toBe("10000000");
      expect(status.caller.nearAccountId).toBeNull();
      expect(status.caller.tier).toBeNull();
    } finally {
      restore();
    }
  });

  it("resolves the caller's balance and tier from the on-chain read", async () => {
    const restore = mockUpstream(rpcMock());
    try {
      BALANCE_FOR_TEST = "500000000000000000000";
      const client = await getPluginClient({ nearAccountId: "holder.test" });
      const status = await client.xpostGateStatus();
      expect(status.caller.nearAccountId).toBe("holder.test");
      expect(status.caller.balance).toBe("500");
      expect(status.caller.tier).toBe(0);
    } finally {
      restore();
    }
  });

  it("refresh recomputes the ladder from the pools at the first run", async () => {
    const restore = mockUpstream(rpcMock());
    try {
      const client = await getPluginClient({ userId: "admin-1", role: "admin" });
      const refreshed = await client.xpostGateConfigRefresh();
      expect(refreshed.source).toBe("auto");
      expect(refreshed.tier1).toBe("100000");
      expect(refreshed.tier2).toBe("1000000");
      expect(refreshed.tier3).toBe("10000000");
      expect(Number(refreshed.priceUsd)).toBeGreaterThan(1.0e-5);
      expect(Number(refreshed.priceUsd)).toBeLessThan(1.3e-5);

      const status = await client.xpostGateStatus();
      expect(status.source).toBe("auto");
      expect(status.refreshedAt).toBeTruthy();
    } finally {
      restore();
    }
  });

  it("the drift cap holds a refresh to ±25% of the previous ladder", async () => {
    const restore = mockUpstream(rpcMock());
    try {
      const client = await getPluginClient({ userId: "admin-1", role: "admin" });
      await client.xpostGateConfigSet({ tier1: "2", tier2: "20", tier3: "200" });
      const refreshed = await client.xpostGateConfigRefresh();
      expect(refreshed.source).toBe("auto");
      expect(refreshed.tier1).toBe("2.5");
      expect(refreshed.tier2).toBe("25");
      expect(refreshed.tier3).toBe("250");
    } finally {
      restore();
    }
  });

  it("a failed price read refuses the refresh and keeps the previous row", async () => {
    const restore = mockUpstream(() =>
      Response.json({ error: { message: "node overloaded" } }, { status: 503 }),
    );
    try {
      const client = await getPluginClient({ userId: "admin-1", role: "admin" });
      await expect(client.xpostGateConfigRefresh()).rejects.toThrow(/XPOST gate read failed/);
      const status = await client.xpostGateStatus();
      expect(status.source).toBe("auto");
      expect(status.tier1).toBe("2.5");
    } finally {
      restore();
    }
  });

  it("only admins may pin or refresh; a manual pin is visible in status", async () => {
    const restore = mockUpstream(rpcMock());
    try {
      const admin = await getPluginClient({ userId: "admin-1", role: "admin" });
      const pinned = await admin.xpostGateConfigSet({ tier1: "2", tier2: "20", tier3: "200" });
      expect(pinned.source).toBe("manual");

      const pleb = await getPluginClient({ userId: "pleb-1", role: "user" });
      await expect(pleb.xpostGateConfigSet({ tier1: "1", tier2: "1", tier3: "1" })).rejects.toThrow(
        /Admin role required/,
      );
      await expect(pleb.xpostGateConfigRefresh()).rejects.toThrow(/Admin role required/);

      const anon = await getPluginClient();
      await expect(anon.xpostGateConfigRefresh()).rejects.toThrow();

      const status = await admin.xpostGateStatus();
      expect(status.source).toBe("manual");
      expect(status.tier1).toBe("2");
    } finally {
      restore();
    }
  });

  it("a manual DB row overrides the variable ladder inside the dispatch gate", async () => {
    const restore = mockUpstream(rpcMock());
    try {
      const client = await getPluginClient({
        userId: "user-1",
        role: "admin",
        nearAccountId: "holder.test",
      });
      await client.outlayerAppWalletAttach({ agentId: "agent-tier", rowProfile: "tier_test" });

      BALANCE_FOR_TEST = "5000000000000000000";
      const admitted = await client.outlayerCall({
        agentId: "agent-tier",
        connector: "work.efiz.near/x",
        operation: "status",
        input: {},
      });
      expect(admitted.callId).toBe("call_gate");

      BALANCE_FOR_TEST = "1000000000000000000";
      await expect(
        client.outlayerCall({
          agentId: "agent-tier",
          connector: "work.efiz.near/x",
          operation: "status",
          input: {},
        }),
      ).rejects.toThrow(/hold at least 2 XPOST/);
    } finally {
      restore();
    }
  });
});
