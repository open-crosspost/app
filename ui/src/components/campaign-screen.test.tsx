import type { ConnectedAccount } from "@crosspost/plugin/types";
import { Platform } from "@crosspost/plugin/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCampaign } from "@/lib/campaigns";
import { type CampaignPostResult, CampaignScreen } from "./campaign-screen";

const campaign = getCampaign("gm");

const nearSocialAccount: ConnectedAccount = {
  platform: "Near Social" as Platform,
  userId: "alice.near",
  connectedAt: "",
  profile: {
    userId: "alice.near",
    username: "Alice",
    profileImageUrl: "",
    platform: "Near Social" as Platform,
    lastUpdated: 0,
  },
};

const twitterAccount = {
  platform: Platform.TWITTER,
  userId: "1877554594651451392",
  connectedAt: "",
  profile: {
    userId: "1877554594651451392",
    username: "open_crosspost",
    profileImageUrl: "",
    platform: Platform.TWITTER,
    lastUpdated: 0,
  },
} as ConnectedAccount;

function renderCampaign(options?: {
  nearSocialAccount?: ConnectedAccount | null;
  twitterAccount?: ConnectedAccount | null;
  onPost?: (input: {
    destination: "near-social" | "twitter";
    text: string;
    accountId: string;
  }) => Promise<CampaignPostResult>;
}) {
  if (!campaign) {
    throw new Error("GM campaign is missing");
  }

  const onPost =
    options?.onPost ??
    vi.fn(async () => ({
      destination: "near-social" as const,
      accountId: "alice.near",
    }));

  render(
    <CampaignScreen
      campaign={campaign}
      nearSocialAccount={
        options && "nearSocialAccount" in options
          ? (options.nearSocialAccount ?? null)
          : nearSocialAccount
      }
      twitterAccount={options?.twitterAccount ?? null}
      connectHref="/manage"
      onPost={onPost}
    />,
  );

  return { onPost };
}

afterEach(() => {
  cleanup();
});

describe("GM campaign screen", () => {
  it("shows the campaign title and destination choices", () => {
    renderCampaign();

    expect(screen.getByRole("heading", { name: "GM Campaign" })).toBeTruthy();
    expect(screen.getByText(/Post GM from your account\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Near Social/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /X/ }).hasAttribute("disabled")).toBe(false);
    expect(screen.queryByText("Coming soon")).toBeNull();
  });

  it("asks to connect X when the X destination is selected without an X account", async () => {
    const { userEvent } = await import("@testing-library/user-event").then((mod) => ({
      userEvent: mod.default ?? mod,
    }));
    renderCampaign();
    await userEvent.click(screen.getByRole("button", { name: /X/ }));

    expect(screen.getByRole("link", { name: "Connect X" }).getAttribute("href")).toBe("/manage");
    expect(screen.getByRole("button", { name: "GM" }).hasAttribute("disabled")).toBe(true);
  });

  it("posts GM to X when the X account is connected", async () => {
    const { userEvent } = await import("@testing-library/user-event").then((mod) => ({
      userEvent: mod.default ?? mod,
    }));
    const { onPost } = renderCampaign({ twitterAccount });
    await userEvent.click(screen.getByRole("button", { name: /X/ }));
    await userEvent.click(screen.getByRole("button", { name: "GM" }));

    expect(onPost).toHaveBeenCalledWith({
      destination: "twitter",
      text: "GM",
      accountId: "1877554594651451392",
    });
  });

  it("asks to connect the wallet when Near Social is missing", () => {
    renderCampaign({ nearSocialAccount: null });

    expect(screen.getByRole("link", { name: "Connect wallet" }).getAttribute("href")).toBe(
      "/manage",
    );
    expect(screen.getByRole("button", { name: "GM" }).hasAttribute("disabled")).toBe(true);
  });

  it("enables GM when Near Social is selected and available", () => {
    renderCampaign();

    expect(screen.getByText("Posting as @Alice on Near Social")).toBeTruthy();
    expect(screen.getByRole("button", { name: "GM" }).hasAttribute("disabled")).toBe(false);
  });

  it("posts GM once while a request is in flight", async () => {
    let resolvePost: (result: CampaignPostResult) => void = () => {};
    const onPost = vi.fn(
      () =>
        new Promise<CampaignPostResult>((resolve) => {
          resolvePost = resolve;
        }),
    );
    renderCampaign({ onPost });

    const button = screen.getByRole("button", { name: "GM" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onPost).toHaveBeenCalledTimes(1);
    expect(onPost).toHaveBeenCalledWith({
      destination: "near-social",
      text: "GM",
      accountId: "alice.near",
    });
    expect(await screen.findByRole("button", { name: "Posting..." })).toBeTruthy();

    resolvePost({
      destination: "near-social",
      accountId: "alice.near",
    });

    expect((await screen.findByRole("status")).textContent).toContain(
      "Posted “GM” to Near Social as alice.near",
    );
  });

  it("shows an error when posting fails", async () => {
    const onPost = vi.fn(async () => {
      throw new Error("NEAR wallet not connected. Connect your wallet first.");
    });
    renderCampaign({ onPost });

    fireEvent.click(screen.getByRole("button", { name: "GM" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn’t post GM");
    expect(alert.textContent).toContain("Connect your NEAR wallet, then try again.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("hides technical relayer details from users", async () => {
    const onPost = vi.fn(async () => {
      throw new Error(
        "NEAR relayer is not configured. Set NEAR_RELAYER_PRIVATE_KEY_MAINNET in .env",
      );
    });
    renderCampaign({ onPost });

    fireEvent.click(screen.getByRole("button", { name: "GM" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn’t post GM");
    expect(alert.textContent).toContain(
      "Posting is temporarily unavailable. Please try again later.",
    );
    expect(alert.textContent).not.toContain("NEAR_RELAYER_PRIVATE_KEY_MAINNET");
    expect(alert.textContent).not.toContain(".env");
  });
});
