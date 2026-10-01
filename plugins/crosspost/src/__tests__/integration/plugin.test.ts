import { createPluginRuntime } from "every-plugin";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import CrosspostPlugin from "../../index";
import { Platform } from "../../types/platform";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const TEST_CONFIG = {
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

describe("Crosspost Plugin Integration Tests", () => {
  const runtime = createPluginRuntime({
    registry: {
      "@crosspost/plugin": { module: CrosspostPlugin },
    },
    secrets: { NEAR_AUTH_DATA: "test-auth-data" },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    // Mock health check for initialization
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { status: "ok", timestamp: "2023-01-01T00:00:00Z" },
        }),
    });

    const { initialized } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
    expect(initialized).toBeDefined();
    expect(initialized.plugin.id).toBe("@crosspost/plugin");
  });

  describe("Auth procedures", () => {
    it("should authorize NEAR account", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { signerId: "test.near", isAuthorized: true },
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();
      const result = await client.auth.authorizeNearAccount({});

      expect(result).toEqual({
        signerId: "test.near",
        isAuthorized: true,
      });
    });

    it("should get connected accounts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              accounts: [
                {
                  platform: "twitter",
                  userId: "123456",
                  connectedAt: "2023-01-01T00:00:00Z",
                  profile: null,
                },
              ],
            },
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();
      const result = await client.auth.getConnectedAccounts();

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]?.platform).toBe("twitter");
    });
  });

  describe("Post procedures", () => {
    it("should create post", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              summary: { total: 1, succeeded: 1, failed: 0 },
              results: [
                {
                  platform: "twitter",
                  userId: "123456",
                  details: { id: "post-123" },
                },
              ],
            },
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();
      const result = await client.post.create({
        targets: [{ platform: Platform.TWITTER, userId: "123456" }],
        content: [{ text: "Hello world!" }],
      });

      expect(result.data.summary.total).toBe(1);
      expect(result.data.summary.succeeded).toBe(1);
      expect(result.data.results).toHaveLength(1);
    });

    it("should like post", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              summary: { total: 1, succeeded: 1, failed: 0 },
              results: [
                {
                  platform: "twitter",
                  userId: "123456",
                  details: { success: true, id: "post-123" },
                },
              ],
            },
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();
      const result = await client.post.like({
        targets: [{ platform: Platform.TWITTER, userId: "123456" }],
        platform: Platform.TWITTER,
        postId: "post-123",
      });

      expect(result.data.summary.succeeded).toBe(1);
    });
  });

  describe("Activity procedures", () => {
    it("should get leaderboard", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              leaderboard: [
                {
                  signerId: "test.near",
                  postCount: 10,
                  firstPostTimestamp: 1672531200000,
                  lastPostTimestamp: 1672531200000,
                },
              ],
              total: 1,
            },
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();
      const result = await client.activity.getLeaderboard();

      expect(result.total).toBe(1);
      expect(result.leaderboard).toHaveLength(1);
      expect(result.leaderboard[0]?.signerId).toBe("test.near");
    });

    it("should get account activity", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              signerId: "test.near",
              activity: [
                {
                  signerId: "test.near",
                  platform: "twitter",
                  postCount: 10,
                  firstPostTimestamp: 1672531200000,
                  lastPostTimestamp: 1672531200000,
                },
              ],
              total: 1,
            },
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();
      const result = await client.activity.getAccountActivity({
        signerId: "test.near",
      });

      expect(result.signerId).toBe("test.near");
      expect(result.activity[0]?.postCount).toBe(10);
    });
  });

  describe("System procedures", () => {
    it("should get health status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { status: "ok", timestamp: "2023-01-01T00:00:00Z" },
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();
      const result = await client.system.getHealthStatus();

      expect(result.status).toBe("ok");
    });

    it("should get rate limits", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              limits: [
                {
                  platform: "twitter",
                  limits: {
                    post: { limit: 100, remaining: 100, reset: 1672531200000, resetAfter: 900 },
                  },
                },
              ],
            },
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();
      const result = await client.system.getRateLimits();

      expect(result.limits[0]?.limits.post?.remaining).toBe(100);
    });
  });

  describe("Error handling", () => {
    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            errors: [
              {
                message: "Authentication failed",
                code: "AUTH_ERROR",
                details: { platform: "twitter" },
                recoverable: false,
              },
            ],
          }),
      });

      const { createClient } = await runtime.usePlugin("@crosspost/plugin", TEST_CONFIG);
      const client = createClient();

      await expect(client.auth.authorizeNearAccount({})).rejects.toThrow("Authentication failed");
    });
  });
});
