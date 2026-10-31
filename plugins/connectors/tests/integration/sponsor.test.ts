import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { configureTestConfig, getPluginClient, mockUpstream } from "../setup";

/**
 * Sponsor telemetry: the public stats route totals the app-key sponsored
 * calls, and the admin status route reads the shared wallet's on-chain NEAR
 * balance, a best-effort OutLayer remaining balance, and the spend windows.
 * The route is admin-only — a regular user is refused.
 */

describe("sponsor telemetry", () => {
  beforeAll(() => {
    configureTestConfig({
      secrets: { OUTLAYER_APP_PAYMENT_KEY: "sponsor.test:1:pk_app_shared" },
      variables: { SPONSOR_WARN_NEAR: "2", SPONSOR_WARN_USD: "5" },
    });
  });

  afterEach(() => {
    mockUpstream(() => Response.json({}));
  });

  it("reports zero sponsorship before any call", async () => {
    const client = await getPluginClient();
    const stats = await client.sponsorStats();
    expect(stats.sponsoredPosts).toBe(0);
    expect(stats.sponsoredUsdMicros).toBe("0");
    expect(stats.lastSponsoredAt).toBeNull();
  });

  it("totals the sponsored calls and reads the wallet health for admins", async () => {
    const restore = mockUpstream((url, init) => {
      if (url.startsWith("https://rpc.test")) {
        return Response.json({ result: { amount: "3000000000000000000000000" } });
      }
      if (url === "https://outlayer.test/wallet/v1/balance") {
        expect((init?.headers as Record<string, string>).Authorization).toBe(
          "Bearer sponsor.test:1:pk_app_shared",
        );
        return Response.json({ remaining_usd: "2.50" });
      }
      return Response.json({
        call_id: "call_x",
        status: "completed",
        compute_cost: "1500",
        output: { success: true },
      });
    });
    try {
      const caller = await getPluginClient({ userId: "user-1" });
      for (const agentId of ["agent-s1", "agent-s2"]) {
        await caller.outlayerCall({
          walletId: "wallet-1",
          paymentKey: "pk_app_shared",
          agentId,
          connector: "gmail",
          operation: "status",
          input: {},
        });
      }

      const stats = await getPluginClient().then((c) => c.sponsorStats());
      expect(stats.sponsoredPosts).toBe(2);
      expect(stats.sponsoredUsdMicros).toBe("3000");
      expect(stats.lastSponsoredAt).toBeTruthy();

      const admin = await getPluginClient({ userId: "admin-1", role: "admin" });
      const status = await admin.appSponsorStatus();
      expect(status.configured).toBe(true);
      expect(status.walletOwner).toBe("sponsor.test");
      expect(status.keyNonce).toBe("1");
      expect(status.nearBalanceNear).toBe("3.00000");
      expect(status.outlayerKeyRemainingUsd).toBe("2.50");
      expect(status.windows.day.posts).toBe(2);
      expect(status.windows.month.usdMicros).toBe("3000");
      expect(status.daily).toHaveLength(30);
      expect(status.thresholds).toEqual({ warnNear: "2", warnUsd: "5" });
      const activeDays = status.daily.filter((point) => point.posts > 0);
      expect(activeDays).toHaveLength(1);
      expect(activeDays[0]?.usdMicros).toBe("3000");
    } finally {
      restore();
    }
  });

  it("refuses the status route for non-admin users", async () => {
    const client = await getPluginClient({ userId: "user-1" });
    await expect(client.appSponsorStatus()).rejects.toThrow(/Admin role required/);
  });
});
