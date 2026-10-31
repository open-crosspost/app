import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getPluginClient, mockUpstream, outboundTransfers } from "../setup";

const ADDRESS_OK = () => Response.json({ wallet_id: "wallet-9", address: "b".repeat(64) });

describe("connectors bridge (fetch-mocked upstreams)", () => {
  beforeAll(async () => {
    await getPluginClient({ userId: "user-1" });
  });

  afterEach(() => {
    mockUpstream(() => Response.json({}));
    outboundTransfers.length = 0;
  });

  it("agentBudget maps the Agent Connect budget usage", async () => {
    const restore = mockUpstream((url) => {
      expect(url).toContain("agent-api.test/v1/agents/agent-1/policy");
      return Response.json({
        usage: {
          budget: {
            daily: {
              limit_usd: "10",
              spent_usd: "2.50",
              remaining_usd: "7.50",
              resets_at: "2026-10-20T00:00:00Z",
            },
          },
        },
      });
    });
    try {
      const client = await getPluginClient({ userId: "user-1" });
      const budget = await client.agentBudget({ agentId: "agent-1" });
      expect(budget.daily?.limitUsd).toBe("10");
      expect(budget.daily?.spentUsd).toBe("2.50");
      expect(budget.daily?.remainingUsd).toBe("7.50");
    } finally {
      restore();
    }
  });

  it("agentTopup resolves the grant server-side and records an event", async () => {
    const restore = mockUpstream((url) => {
      expect(url).not.toContain("agent-api.test/v1/agents/agent-1/transfer");
      return Response.json({});
    });
    try {
      const client = await getPluginClient({ userId: "user-1" });
      const result = await client.agentTopup({
        agentId: "agent-1",
        outlayerWalletId: "a".repeat(64),
        amountNear: "1000000000000000000000000",
      });
      expect(result.correlationId).toBe("op_transfer");
      expect(outboundTransfers).toHaveLength(1);
      const [transfer] = outboundTransfers;
      expect(transfer?.recipient).toBe("a".repeat(64));
      expect(transfer?.amountNear).toBe("1000000000000000000000000");

      const clientAfter = await getPluginClient({ userId: "user-1" });
      const events = await clientAfter.events({ agentId: "agent-1" });
      expect(events.data).toHaveLength(1);
      expect(events.data[0]?.kind).toBe("topup");
    } finally {
      restore();
    }
  });

  it("setup registers a wallet, claims the trial key, and never returns the wk_", async () => {
    const seen: { url: string; auth?: string; method?: string }[] = [];
    const restore = mockUpstream((url, init) => {
      seen.push({
        url,
        method: init?.method,
        auth: (init?.headers as Record<string, string>)?.["Authorization"],
      });
      if (url.includes("/register")) {
        return Response.json({
          api_key: "wk_fresh",
          wallet_id: "wallet-new",
          near_account_id: "c".repeat(64),
        });
      }
      if (url.includes("/trial-key")) {
        return Response.json({ payment_key: "pk_trial", nonce: 0 });
      }
      return Response.json({});
    });
    try {
      const client = await getPluginClient({ userId: "user-1" });
      const setup = await client.outlayerWalletSetup({ agentId: "agent-setup" });
      expect(setup.created).toBe(true);
      expect(setup.nearAccountId).toBe("c".repeat(64));
      expect(setup.walletId).toBe("wallet-new");
      expect(setup.keySource).toBe("trial");

      expect(JSON.stringify(setup)).not.toContain("wk_");
      expect(JSON.stringify(setup)).not.toContain("pk_trial");
      expect(seen.some((call) => call.url.includes("/register"))).toBe(true);
      expect(seen.some((call) => call.url.includes("/trial-key"))).toBe(true);

      const info = await client.bridgeInfo({ agentId: "agent-setup" });
      expect(info.wallet?.nearAccountId).toBe("c".repeat(64));
      expect(info.wallet?.paymentKey).toBe("pk_trial");
      expect(info.wallet?.keySource).toBe("trial");
      expect(JSON.stringify(info)).not.toContain("wk_");
    } finally {
      restore();
    }
  });

  it("setup is idempotent — a second call returns the stored wallet untouched", async () => {
    const client = await getPluginClient({ userId: "user-1" });
    const second = await client.outlayerWalletSetup({ agentId: "agent-setup" });
    expect(second.created).toBe(false);
    expect(second.nearAccountId).toBe("c".repeat(64));
  });

  it("connect stores the wallet and re-reads an already-claimed trial", async () => {
    const restore = mockUpstream((url, init) => {
      if (url.includes("/wallet/v1/address")) {
        expect((init?.headers as Record<string, string>)["Authorization"]).toBe("Bearer wk_test");
        return ADDRESS_OK();
      }
      if (url.includes("/trial-key")) {
        return Response.json(
          { error: "already claimed", reason: "trial_already_claimed", terminal: true },
          { status: 409 },
        );
      }
      if (url.includes("/wallet/v1/payment-key")) {
        return Response.json({ payment_key: "pk_trial_existing" });
      }
      return Response.json({});
    });
    try {
      const client = await getPluginClient({ userId: "user-1" });
      const connected = await client.outlayerWalletConnect({
        agentId: "agent-connect",
        walletApiKey: "wk_test",
      });
      expect(connected.nearAccountId).toBe("b".repeat(64));
      expect(connected.walletId).toBe("wallet-9");
      expect(connected.keySource).toBe("trial");

      const info = await client.bridgeInfo({ agentId: "agent-connect" });
      expect(info.wallet?.paymentKey).toBe("pk_trial_existing");
      expect(info.wallet?.keySource).toBe("trial");
    } finally {
      restore();
    }
  });

  it("connect survives a closed trial window and the call path creates a funded key", async () => {
    const restore = mockUpstream((url) => {
      if (url.includes("/wallet/v1/address")) {
        return ADDRESS_OK();
      }
      if (url.includes("/trial-key")) {
        return Response.json(
          { error: "window closed", reason: "trial_window_closed", terminal: true },
          { status: 403 },
        );
      }
      if (url.includes("/create-payment-key")) {
        return Response.json({ payment_key: "pk_funded", nonce: 1 });
      }
      if (url.includes("/call/")) {
        return Response.json({
          call_id: "call_funded",
          status: "completed",
          compute_cost: "1000",
        });
      }
      return Response.json({});
    });
    try {
      const client = await getPluginClient({ userId: "user-1" });
      const connected = await client.outlayerWalletConnect({
        agentId: "agent-funded",
        walletApiKey: "wk_test",
      });
      expect(connected.keySource).toBe("none");

      const info = await client.bridgeInfo({ agentId: "agent-funded" });
      expect(info.wallet?.paymentKey).toBeNull();

      const call = await client.outlayerCall({
        agentId: "agent-funded",
        connector: "gmail",
        operation: "status",
        input: {},
      });
      expect(call.callId).toBe("call_funded");
      expect(call.keySource).toBe("funded");

      const infoAfter = await client.bridgeInfo({ agentId: "agent-funded" });
      expect(infoAfter.wallet?.paymentKey).toBe("pk_funded");
      expect(infoAfter.wallet?.keySource).toBe("funded");
    } finally {
      restore();
    }
  });

  it("outlayerCall resolves the stored wallet id and payment key server-side", async () => {
    const restore = mockUpstream((url, init) => {
      if (url.includes("/register")) {
        return Response.json({
          api_key: "wk_fresh",
          wallet_id: "wallet-resolved",
          near_account_id: "d".repeat(64),
        });
      }
      if (url.includes("/trial-key")) {
        return Response.json({ payment_key: "pk_resolved", nonce: 0 });
      }
      if (url.includes("/call/")) {
        expect((init?.headers as Record<string, string>)["X-Payment-Key"]).toBe("pk_resolved");
        expect((init?.headers as Record<string, string>)["X-Wallet-Id"]).toBe("wallet-resolved");
        expect(JSON.parse(String(init?.body)).input.operation).toBe("status");
        return Response.json({
          call_id: "call_resolved",
          status: "completed",
          compute_cost: "500",
        });
      }
      return Response.json({});
    });
    try {
      const client = await getPluginClient({ userId: "user-1" });
      await client.outlayerWalletSetup({ agentId: "agent-resolved" });

      const call = await client.outlayerCall({
        agentId: "agent-resolved",
        connector: "gmail",
        operation: "status",
        input: {},
      });
      expect(call.callId).toBe("call_resolved");
      expect(call.keySource).toBe("trial");
    } finally {
      restore();
    }
  });

  it("recordWalletTopup logs a wallet-signed top-up event", async () => {
    const client = await getPluginClient({ userId: "user-1" });
    const recorded = await client.recordWalletTopup({ agentId: "agent-1", txHash: "9vHash…" });
    expect(recorded.id).toBeTruthy();

    const clientAfter = await getPluginClient({ userId: "user-1" });
    const events = await clientAfter.events({ agentId: "agent-1" });
    expect(events.data[0]?.kind).toBe("topup");
  });

  it("outlayerCall passes explicit payment key + wallet id and records the cost", async () => {
    const restore = mockUpstream((url, init) => {
      expect(url).toContain("outlayer.test/call/connectors.outlayer.near/gmail");
      expect((init?.headers as Record<string, string>)["X-Payment-Key"]).toBe("pk_key");
      expect((init?.headers as Record<string, string>)["X-Wallet-Id"]).toBe("wallet-1");
      expect(JSON.parse(String(init?.body)).input.operation).toBe("send_email");
      return Response.json({
        call_id: "call_1",
        status: "completed",
        compute_cost: "1000",
        output: { success: true, operation: "send_email" },
      });
    });
    try {
      const client = await getPluginClient({ userId: "user-1" });
      const result = await client.outlayerCall({
        walletId: "wallet-1",
        paymentKey: "pk_key",
        agentId: "agent-1",
        connector: "gmail",
        operation: "send_email",
        input: {},
      });
      expect(result.callId).toBe("call_1");
      expect(result.status).toBe("completed");
      expect(result.computeCost).toBe("1000");
      expect(result.keySource).toBe("explicit");

      const clientAfter = await getPluginClient({ userId: "user-1" });
      const events = await clientAfter.events({ agentId: "agent-1" });
      expect(events.data[0]?.kind).toBe("call");
      expect(events.data[0]?.connector).toBe("gmail");
    } finally {
      restore();
    }
  });

  it("outlayerCall surfaces upstream refusal codes for the UI to label", async () => {
    const restore = mockUpstream(() =>
      Response.json({ error: "insufficient_balance" }, { status: 402 }),
    );
    try {
      const client = await getPluginClient({ userId: "user-1" });
      await expect(
        client.outlayerCall({
          walletId: "wallet-1",
          paymentKey: "pk_key",
          agentId: "agent-1",
          connector: "gmail",
          operation: "send_email",
          input: {},
        }),
      ).rejects.toThrow(/insufficient_balance/);
    } finally {
      restore();
    }
  });

  it("outlayerCall refuses when no wallet is connected and no explicit ids are given", async () => {
    const client = await getPluginClient({ userId: "user-1" });
    await expect(
      client.outlayerCall({
        agentId: "agent-never-connected",
        connector: "gmail",
        operation: "status",
        input: {},
      }),
    ).rejects.toThrow(/No OutLayer wallet connected/);
  });
});
