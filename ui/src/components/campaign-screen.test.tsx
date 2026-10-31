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

function renderCampaign(options?: {
  nearSocialAccount?: ConnectedAccount | null;
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
    expect(screen.getByText(/Near Social works now/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Near Social/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /X/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Coming soon")).toBeTruthy();
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
      'Posted “GM” to Near Social as alice.near',
    );
  });

  it("shows an error when posting fails", async () => {
    const onPost = vi.fn(async () => {
      throw new Error("NEAR wallet not connected. Connect your wallet first.");
    });
    renderCampaign({ onPost });

    fireEvent.click(screen.getByRole("button", { name: "GM" }));

    expect((await screen.findByRole("alert")).textContent).toContain("NEAR wallet not connected");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
