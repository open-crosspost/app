import { createPluginRuntime } from "every-plugin";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CrosspostPlugin from "../../index";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Activity Integration Tests", () => {
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

  it("should get leaderboard", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          leaderboard: [
            {
              signerId: "test.near",
              postCount: 10,
              firstPostTimestamp: 1672531200000,
              lastPostTimestamp: 1672531200000,
            },
          ],
          total: 1,
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
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
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.activity.getAccountActivity({
      signerId: "test.near",
    });

    expect(result.signerId).toBe("test.near");
    expect(result.activity[0]?.postCount).toBe(10);
  });

  it("should get account posts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          signerId: "test.near",
          posts: [
            {
              id: "post-123",
              platform: "twitter",
              userId: "123456",
              type: "post",
              content: "Hello world!",
              createdAt: "2023-01-01T00:00:00Z",
            },
          ],
        }),
    });

    const { createClient } = await runtime.usePlugin("@crosspost/plugin", config);
    const client = createClient();
    const result = await client.activity.getAccountPosts({
      signerId: "test.near",
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]?.id).toBe("post-123");
  });
});
