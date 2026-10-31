import { ApiErrorCode } from "@crosspost/plugin/types";
import { describe, expect, it } from "vitest";
import { connectorErrorDetail, connectorSuccessDetail, postToX } from "./connector-post";

describe("connectorSuccessDetail", () => {
  it("maps a connector result to a success detail keyed by account", () => {
    const detail = connectorSuccessDetail({ accountId: "alice", callId: "call-1" }, "user-1");
    expect(detail).toMatchObject({
      platform: "twitter",
      userId: "user-1",
      status: "success",
      details: { message: "Posted to X as @alice", callId: "call-1" },
    });
  });
});

describe("connectorErrorDetail", () => {
  it("maps an Error into an unrecoverable platform error", () => {
    const detail = connectorErrorDetail(new Error("boom"), "user-1");
    expect(detail).toMatchObject({
      message: "boom",
      code: ApiErrorCode.PLATFORM_ERROR,
      recoverable: false,
      details: { platform: "twitter", userId: "user-1" },
    });
  });

  it("falls back to a generic message for non-Error throws", () => {
    const detail = connectorErrorDetail("nope", "user-1");
    expect(detail.message).toBe("Posting to X failed.");
    expect(detail.code).toBe(ApiErrorCode.PLATFORM_ERROR);
  });
});

describe("postToX", () => {
  it("throws when the connector call does not complete", async () => {
    const apiClient = {
      connectors: {
        outlayerCall: async () => ({
          callId: "call-1",
          status: "failed",
          output: null,
          error: "rate limited",
        }),
      },
    } as never;

    await expect(postToX(apiClient, "agent-1", "GM")).rejects.toThrow("rate limited");
  });

  it("throws when the completed call has no username in its output", async () => {
    const apiClient = {
      connectors: {
        outlayerCall: async () => ({
          callId: "call-1",
          status: "completed",
          output: {},
        }),
      },
    } as never;

    await expect(postToX(apiClient, "agent-1", "GM")).rejects.toThrow(
      "The connector did not publish the post.",
    );
  });

  it("returns the accountId and callId on success", async () => {
    const calls: unknown[] = [];
    const apiClient = {
      connectors: {
        outlayerCall: async (input: unknown) => {
          calls.push(input);
          return { callId: "call-9", status: "completed", output: { username: "alice" } };
        },
      },
    } as never;

    const result = await postToX(apiClient, "agent-1", "GM");
    expect(result).toEqual({ accountId: "alice", callId: "call-9" });
    expect(calls[0]).toMatchObject({
      agentId: "agent-1",
      operation: "post",
      input: { text: "GM" },
    });
  });
});
