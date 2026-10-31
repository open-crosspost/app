import { beforeEach, describe, expect, it, vi } from "vitest";
import { NETWORK_ID } from "@/config";
import {
  buildFastDataKvArgs,
  directFallbackEnabled,
  postToNearSocialDirect,
  RelayerUnavailableError,
  rememberDirectFallback,
  toNearSocialUserError,
  verifyInBackground,
} from "./near-social-post";

describe("buildFastDataKvArgs", () => {
  it("keys the write under post/<timestamp> with the text value", () => {
    const args = buildFastDataKvArgs("gm");
    const keys = Object.keys(args);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^post\/\d+$/);
    expect(args[keys[0]]).toEqual({ text: "gm" });
  });

  it("writes reply_to, root, and the backlink key in one action", () => {
    const args = buildFastDataKvArgs("gm", {
      parentAccount: "crosspost.near",
      parentPostId: "1759140000000",
    });
    const keys = Object.keys(args);
    expect(keys).toHaveLength(2);

    const postKey = keys.find((key) => key.startsWith("post/"));
    const replyKey = keys.find((key) => key.startsWith("reply/"));
    expect(postKey).toMatch(/^post\/\d+$/);
    expect(replyKey).toBe(`reply/crosspost.near/1759140000000/${postKey!.slice("post/".length)}`);

    const postValue = args[postKey!] as { text: string; reply_to: string; root: string };
    expect(postValue.text).toBe("gm");
    expect(postValue.reply_to).toBe("crosspost.near/1759140000000");
    expect(postValue.root).toBe("crosspost.near/1759140000000");

    expect(args[replyKey!]).toEqual({});
  });
});

describe("toNearSocialUserError", () => {
  it("passes the relayer-unavailable reason through verbatim", () => {
    const error = new RelayerUnavailableError("The post relayer isn't funded right now.");
    expect(toNearSocialUserError(error)).toBe("The post relayer isn't funded right now.");
  });

  it("maps wallet-required errors to a connect prompt", () => {
    expect(toNearSocialUserError(new Error("Wallet not connected"))).toBe(
      "Connect your NEAR wallet, then try again.",
    );
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(toNearSocialUserError(new Error("ed25519 signature mismatch"))).toBe(
      "Something went wrong while posting. Please try again.",
    );
  });
});

describe("direct fallback session memory", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("is disabled by default", () => {
    expect(directFallbackEnabled()).toBe(false);
  });

  it("remembers the choice for the session", () => {
    rememberDirectFallback();
    expect(directFallbackEnabled()).toBe(true);
  });
});

describe("postToNearSocialDirect", () => {
  it("refuses to run off mainnet", async () => {
    if (NETWORK_ID === "mainnet") {
      expect(true).toBe(true);
      return;
    }
    const near = {} as never;
    await expect(postToNearSocialDirect(near, "gm")).rejects.toThrow("mainnet only");
  });
});

describe("verifyInBackground", () => {
  it("reports a rejected write through onRejected without throwing", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        indexed: true,
        actions: [{ keys: [{ status: "rejected", reason: "rate limited" }] }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const onRejected = vi.fn();

    expect(() => verifyInBackground("tx-1", onRejected)).not.toThrow();
    await vi.waitFor(() => {
      expect(onRejected).toHaveBeenCalledWith("rate limited");
    });
    vi.unstubAllGlobals();
  });

  it("stays silent when the write is confirmed", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        indexed: true,
        actions: [{ keys: [{ status: "ok" }] }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const onRejected = vi.fn();

    verifyInBackground("tx-1", onRejected);
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    // give the rejection path a chance to (wrongly) fire
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onRejected).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
