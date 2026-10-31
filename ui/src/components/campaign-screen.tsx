import type { ConnectedAccount } from "@crosspost/plugin/types";
import { type ReactNode, useMemo, useRef, useState } from "react";
import type { Campaign, CampaignDestinationId, CampaignPostAction } from "@/lib/campaigns";
import { Button } from "./ui/button";

export type CampaignPostResult = {
  destination: CampaignDestinationId;
  accountId: string;
  txHash?: string;
};

type Outcome =
  | { state: "idle" }
  | { state: "pending" }
  | {
      state: "success";
      accountId: string;
      destination: CampaignDestinationId;
      txHash?: string;
    }
  | { state: "error"; message: string };

function accountLabel(account: ConnectedAccount): string {
  return account.profile?.username ? `@${account.profile.username}` : account.userId;
}

function CampaignPostForm({
  action,
  nearSocialAccount,
  accountsLoading,
  connectHref,
  onPost,
}: {
  action: CampaignPostAction;
  nearSocialAccount: ConnectedAccount | null;
  accountsLoading: boolean;
  connectHref: string;
  onPost: (input: {
    destination: CampaignDestinationId;
    text: string;
    accountId: string;
  }) => Promise<CampaignPostResult>;
}) {
  const pendingRef = useRef(false);
  const enabledDestinations = useMemo(
    () => action.destinations.filter((destination) => destination.enabled),
    [action.destinations],
  );
  const defaultDestination =
    enabledDestinations.find((destination) => destination.id === "near-social")?.id ??
    enabledDestinations[0]?.id ??
    null;
  const [selectedDestination, setSelectedDestination] = useState<CampaignDestinationId | null>(
    defaultDestination,
  );
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });

  const activeDestination =
    action.destinations.find((destination) => destination.id === selectedDestination) ?? null;
  const canUseNearSocial =
    activeDestination?.id === "near-social" && activeDestination.enabled && !!nearSocialAccount;
  const canSubmit = canUseNearSocial && outcome.state !== "pending";

  const handleSubmit = async () => {
    if (pendingRef.current || !activeDestination?.enabled || !nearSocialAccount) {
      return;
    }
    if (activeDestination.id !== "near-social") {
      return;
    }

    pendingRef.current = true;
    setOutcome({ state: "pending" });

    try {
      const result = await onPost({
        destination: activeDestination.id,
        text: action.text,
        accountId: nearSocialAccount.userId,
      });
      setOutcome({
        state: "success",
        accountId: result.accountId,
        destination: result.destination,
        txHash: result.txHash,
      });
    } catch (error) {
      setOutcome({
        state: "error",
        message:
          error instanceof Error && error.message ? error.message : "Could not post to Near Social.",
      });
    } finally {
      pendingRef.current = false;
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Posts “{action.text}” from the account you select.</p>

      <div className="space-y-2">
        <p className="text-sm font-medium">Post to</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {action.destinations.map((destination) => {
            const selected = selectedDestination === destination.id;
            const disabled = !destination.enabled;
            return (
              <button
                key={destination.id}
                type="button"
                disabled={disabled}
                title={disabled ? `${destination.label} coming soon` : undefined}
                onClick={() => {
                  if (!disabled) {
                    setSelectedDestination(destination.id);
                    setOutcome({ state: "idle" });
                  }
                }}
                className={`rounded-md border p-3 text-left transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-70"
                    : selected
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-card-foreground hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{destination.label}</span>
                  {disabled ? (
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  ) : selected ? (
                    <span className="text-xs text-primary">Selected</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {accountsLoading ? (
        <p className="text-sm text-muted-foreground">Loading accounts...</p>
      ) : activeDestination?.id === "twitter" ? (
        <p className="text-sm text-muted-foreground">X posting is not enabled yet.</p>
      ) : nearSocialAccount ? (
        <p className="text-sm text-muted-foreground">
          Posting as {accountLabel(nearSocialAccount)} on Near Social
        </p>
      ) : (
        <div className="space-y-3 rounded-md border bg-card p-4 text-card-foreground">
          <p className="text-sm text-muted-foreground">
            Connect your NEAR wallet to post GM on Near Social.
          </p>
          <Button asChild>
            <a href={connectHref}>Connect wallet</a>
          </Button>
        </div>
      )}

      <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
        {outcome.state === "pending" ? "Posting..." : action.label}
      </Button>

      {outcome.state === "success" ? (
        <p className="text-sm text-success" role="status">
          Posted “{action.text}” to Near Social as {outcome.accountId}
          {outcome.txHash ? ` (tx ${outcome.txHash.slice(0, 8)}…)` : ""}.
        </p>
      ) : null}
      {outcome.state === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {outcome.message}
        </p>
      ) : null}
    </div>
  );
}

export function CampaignScreen({
  campaign,
  nearSocialAccount,
  accountsLoading = false,
  connectHref,
  onPost,
  back,
}: {
  campaign: Campaign;
  nearSocialAccount: ConnectedAccount | null;
  accountsLoading?: boolean;
  connectHref: string;
  onPost: (input: {
    destination: CampaignDestinationId;
    text: string;
    accountId: string;
  }) => Promise<CampaignPostResult>;
  back?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 border-b pb-4">
        {back ? <div className="mb-4">{back}</div> : null}
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        <p className="text-muted-foreground">{campaign.description}</p>
      </div>
      <div className="space-y-8">
        {campaign.actions.map((action) => (
          <CampaignPostForm
            key={action.id}
            action={action}
            nearSocialAccount={nearSocialAccount}
            accountsLoading={accountsLoading}
            connectHref={connectHref}
            onPost={onPost}
          />
        ))}
      </div>
    </div>
  );
}
