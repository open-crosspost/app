import { ApiErrorCode, Platform } from "@crosspost/plugin/types";
import { describe, expect, it } from "vitest";
import {
  connectorErrorDetail,
  connectorSuccessDetail,
  parseConnectorOutcome,
  postToX,
} from "./connector-post";

const account = {
  platform: Platform.TWITTER,
  userId: "elliot_braemTwitter",
  connectedAt: "2026-01-01T00:00:00.000Z",
  profile: {
    userId: "123",
    username: "elliot_braem",
    profileImageUrl: "https://example.com/p.png",
    platform: Platform.TWITTER,
    lastUpdated: 0,
  },
} as unknown as Parameters<typeof connectorSuccessDetail>[1];

describe("connectorSuccessDetail", () => {
  it("maps a connector result to a success detail keyed by account", () => {
    const detail = connectorSuccessDetail(
      { callId: "call-1", tweetUrl: "https://x.com/elliot_braem/status/1", computeCost: null },
      account,
    );
    expect(detail).toMatchObject({
      platform: "twitter",
      userId: "elliot_braemTwitter",
      status: "success",
      details: {
        message: "Posted to X as @elliot_braem — https://x.com/elliot_braem/status/1",
        callId: "call-1",
      },
    });
  });

  it("appends the sponsorship cost when the call was metered", () => {
    const detail = connectorSuccessDetail(
      { callId: "call-1", tweetUrl: null, computeCost: "1001" },
      { ...account, profile: null },
    );
    expect(detail.details.message).toBe(
      "Posted to X as @elliot_braemTwitter — Sponsored by OpenCrosspost (≈$0.001)",
    );
  });

  it("falls back to the account userId when no profile handle exists", () => {
    const detail = connectorSuccessDetail(
      { callId: "call-1", tweetUrl: null, computeCost: null },
      { ...account, profile: null },
    );
    expect(detail.details.message).toBe("Posted to X as @elliot_braemTwitter");
  });
});

describe("connectorErrorDetail", () => {
  it("maps an Error into an unrecoverable platform error", () => {
    const detail = connectorErrorDetail(new Error("boom"), account);
    expect(detail).toMatchObject({
      message: "boom",
      code: ApiErrorCode.PLATFORM_ERROR,
      recoverable: false,
      details: { platform: "twitter", userId: "elliot_braemTwitter" },
    });
  });

  it("falls back to a generic message for non-Error throws", () => {
    const detail = connectorErrorDetail("nope", account);
    expect(detail.message).toBe("Posting to X failed.");
    expect(detail.code).toBe(ApiErrorCode.PLATFORM_ERROR);
  });
});

describe("parseConnectorOutcome", () => {
  it("accepts the curated X connector's nested success payload", () => {
    const result = parseConnectorOutcome({
      callId: "c93afe21-7dac-4831-95a8-1612a1e28b4b",
      status: "completed",
      keySource: "app",
      computeCost: "1001",
      output: {
        logs: [],
        operation: "post",
        output: {
          remaining_today: 996,
          sent_today: 4,
          text: "gm",
          tweet_id: "2116625991346872769",
          url: "https://x.com/elliot_braem/status/2116625991346872769",
        },
        success: true,
      },
      error: null,
    });
    expect(result).toEqual({
      callId: "c93afe21-7dac-4831-95a8-1612a1e28b4b",
      tweetUrl: "https://x.com/elliot_braem/status/2116625991346872769",
    });
  });

  it("accepts a flat payload shape", () => {
    const result = parseConnectorOutcome({
      callId: "call-1",
      status: "completed",
      output: { tweet_id: "42", url: "https://x.com/alice/status/42" },
      error: null,
    });
    expect(result).toEqual({ callId: "call-1", tweetUrl: "https://x.com/alice/status/42" });
  });

  it("accepts the legacy username-only shape", () => {
    const result = parseConnectorOutcome({
      callId: "call-1",
      status: "completed",
      output: { username: "alice" },
      error: null,
    });
    expect(result).toEqual({ callId: "call-1", tweetUrl: null });
  });

  it("throws with diagnostics when the connector reports an error", () => {
    expect(() =>
      parseConnectorOutcome({
        callId: "call-1",
        status: "failed",
        output: null,
        error: "rate limited",
      }),
    ).toThrow("rate limited (status: failed, callId: call-1)");
  });

  it("throws when a completed call carries no publish evidence", () => {
    expect(() =>
      parseConnectorOutcome({
        callId: "call-1",
        status: "completed",
        output: {},
        error: null,
      }),
    ).toThrow("The connector did not publish the post (status: completed, callId: call-1).");
  });
});

describe("postToX", () => {
  it("posts text through the connectors bridge and returns the tweet url", async () => {
    const calls: unknown[] = [];
    const apiClient = {
      connectors: {
        outlayerCall: async (input: unknown) => {
          calls.push(input);
          return {
            callId: "call-9",
            status: "completed",
            output: {
              success: true,
              output: { tweet_id: "9", url: "https://x.com/alice/status/9" },
            },
            error: null,
          };
        },
      },
    } as never;

    const result = await postToX(apiClient, "agent-1", "GM");
    expect(result).toEqual({
      callId: "call-9",
      tweetUrl: "https://x.com/alice/status/9",
      computeCost: null,
    });
    expect(calls[0]).toMatchObject({
      agentId: "agent-1",
      operation: "post",
      input: { text: "GM" },
    });
  });

  it("passes reply_to through to the bridge when a seed tweet id is given", async () => {
    const calls: unknown[] = [];
    const apiClient = {
      connectors: {
        outlayerCall: async (input: unknown) => {
          calls.push(input);
          return {
            callId: "call-10",
            status: "completed",
            output: {
              success: true,
              output: { tweet_id: "10", url: "https://x.com/alice/status/10" },
            },
            error: null,
          };
        },
      },
    } as never;

    await postToX(apiClient, "agent-1", "gm", "1852180000000");
    expect(calls[0]).toMatchObject({
      agentId: "agent-1",
      operation: "post",
      input: { text: "gm", reply_to: "1852180000000" },
    });
  });
});
