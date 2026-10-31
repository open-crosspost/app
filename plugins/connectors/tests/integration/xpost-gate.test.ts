import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { configureTestConfig, getPluginClient, mockUpstream } from "../setup";

/**
 * The XPOST admission gate: with the gate enabled, app-paid dispatch verifies
 * the caller's NEAR account holds the Tier-1 minimum (fail-closed) BEFORE the
 * connector call is spent. The RPC mocks mimic the wire: call_function
 * results are byte arrays of the view's JSON text.
 */

const viewResult = (value: unknown) =>
  Response.json({ result: { result: Array.from(Buffer.from(JSON.stringify(value))) } });

const methodName = (init?: RequestInit) =>
  (JSON.parse(String(init?.body))?.params?.method_name as string) ?? "";

describe("xpost gate (gate on: tier-1 minimum 2 XPOST)", () => {
  beforeAll(() => {
    configureTestConfig({
      variables: { XPOST_GATE_ENABLED: true, XPOST_TIER_BALANCES: "2,20,200" },
    });
  });

  afterEach(() => {
    mockUpstream(() => Response.json({}));
  });

  it("admits a holder above the minimum and spends the connector call", async () => {
    const restore = mockUpstream((url, init) => {
      if (url.startsWith("https://rpc.test")) {
        return methodName(init) === "ft_metadata"
          ? viewResult({ decimals: 2, symbol: "XPOST" })
          : viewResult("5000000");
      }
      return Response.json({ call_id: "call_held", status: "completed" });
    });
    try {
      const client = await getPluginClient({ userId: "user-1", nearAccountId: "rich.test" });
      await client.outlayerAppWalletAttach({ agentId: "agent-gate", rowProfile: "rich_test" });
      const call = await client.outlayerCall({
        agentId: "agent-gate",
        connector: "work.efiz.near/x",
        operation: "status",
        input: {},
      });
      expect(call.callId).toBe("call_held");
      expect(call.keySource).toBe("app");
    } finally {
      restore();
    }
  });

  it("refuses a balance below the minimum BEFORE any connector call is spent", async () => {
    const restore = mockUpstream((url, init) => {
      if (url.startsWith("https://rpc.test")) {
        return methodName(init) === "ft_metadata"
          ? viewResult({ decimals: 2, symbol: "XPOST" })
          : viewResult("100");
      }
      throw new Error("the connector call must never fire when the gate refuses");
    });
    try {
      const client = await getPluginClient({ userId: "user-1", nearAccountId: "poor.test" });
      await expect(
        client.outlayerCall({
          agentId: "agent-gate-poor",
          connector: "work.efiz.near/x",
          operation: "status",
          input: {},
        }),
      ).rejects.toThrow(/XPOST balance too low/);
    } finally {
      restore();
    }
  });

  it("fails closed when the balance cannot be verified", async () => {
    const restore = mockUpstream((url) => {
      if (url.startsWith("https://rpc.test")) {
        return Response.json({ error: { message: "node overloaded" } }, { status: 503 });
      }
      throw new Error("the connector call must never fire when the gate fails");
    });
    try {
      const client = await getPluginClient({ userId: "user-1", nearAccountId: "any.test" });
      await expect(
        client.outlayerCall({
          agentId: "agent-gate-fail",
          connector: "work.efiz.near/x",
          operation: "status",
          input: {},
        }),
      ).rejects.toThrow(/XPOST gate read failed/);
    } finally {
      restore();
    }
  });
});
