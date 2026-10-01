import { createPluginRuntime } from "every-plugin";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CrosspostPlugin from "../../index";
import { Platform } from "../../types/platform";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Auth Integration Tests", () => {
  const runtime = createPluginRuntime({
    registry: {
      "@crosspost/plugin": { module: CrosspostPlugin },
    },
    secrets: {},
  });

  const config = {
    variables: {
      baseUrl: "https://social.invalid",
      timeout: 5000,
    },
    secrets: {
      nearAuthData: JSON.stringify({
        account_id: "test.near",
        public_key: "ed25519:test",
        signature: "test-signature",
        message: "test-message",
        nonce: new Array(32).fill(0).map((_, i) => i),
        recipient: "crosspost.near",
      }),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should authorize NEAR account", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          signerId: "test.near",
          isAuthorized: true,
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.auth.authorizeNearAccount({});

    expect(result.signerId).toBe("test.near");
    expect(result.isAuthorized).toBe(true);
  });

  it("should get NEAR authorization status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          signerId: "test.near",
          isAuthorized: true,
          authorizedAt: "2023-01-01T00:00:00Z",
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.auth.getNearAuthorizationStatus();

    expect(result.signerId).toBe("test.near");
    expect(result.isAuthorized).toBe(true);
  });

  it("should login to platform", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          url: "https://twitter.com/oauth/authorize?client_id=test",
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.auth.loginToPlatform({
      platform: Platform.TWITTER,
    });

    expect(result.url).toContain("twitter.com/oauth/authorize");
  });

  it("should get connected accounts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accounts: [
            {
              platform: "twitter",
              userId: "123456",
              connectedAt: "2023-01-01T00:00:00Z",
              profile: null,
            },
          ],
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.auth.getConnectedAccounts();

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]?.platform).toBe("twitter");
  });
});
