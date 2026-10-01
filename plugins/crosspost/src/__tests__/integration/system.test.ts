import { createPluginRuntime } from "every-plugin";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CrosspostPlugin from "../../index";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("System Integration Tests", () => {
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

  it("should get health status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "ok",
          timestamp: "2023-01-01T00:00:00Z",
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.system.getHealthStatus();

    expect(result.status).toBe("ok");
  });

  it("should get rate limits", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          limits: [
            {
              platform: "twitter",
              limits: {
                post: { limit: 100, remaining: 100, reset: 1672531200000, resetAfter: 900 },
              },
            },
          ],
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.system.getRateLimits();

    expect(result.limits[0]?.limits.post?.remaining).toBe(100);
  });

  it("should get endpoint rate limit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          endpoint: "/api/post",
          remaining: 50,
          reset: "2023-01-01T00:00:00Z",
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.system.getEndpointRateLimit({
      endpoint: "/api/post",
    });

    expect(result.endpoint).toBe("/api/post");
    expect(result.remaining).toBe(50);
  });
});
