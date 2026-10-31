import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ApiClient } from "@/app";
import { useApiClient, useAuthClient } from "@/app";
import { BackButton } from "@/components/back-button";
import { CampaignScreen } from "@/components/campaign-screen";
import { Button } from "@/components/ui/button";
import { X_CONNECTOR_PROJECT } from "@/config";
import { getCampaign } from "@/lib/campaigns";
import { NearSocialStorageRequiredError, postToNearSocial } from "@/lib/near-social-post";
import {
  getNearSocialAccount,
  getTwitterConnectedAccount,
  nearSocialAccountQueryKey,
  socialAccountsQueryKey,
} from "@/lib/social";

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId")({
  component: CampaignPage,
});

async function postGmToX(apiClient: ApiClient, agentId: string, text: string) {
  const call = await apiClient.connectors.outlayerCall({
    agentId,
    connector: X_CONNECTOR_PROJECT,
    operation: "post",
    input: { text },
  });
  const output = call.output as { username?: string } | null;
  if (call.status !== "completed" || !output || !output.username) {
    throw new Error(call.error || "The connector did not post the GM.");
  }
  return { accountId: output.username, callId: call.callId };
}

function CampaignPage() {
  const { campaignId } = Route.useParams();
  const campaign = getCampaign(campaignId);
  const authClient = useAuthClient();
  const apiClient = useApiClient();
  const { data: session } = authClient.useSession();
  const { data: nearAccountId, isLoading: isLoadingNearAccountId } = useQuery({
    queryKey: ["near", "accountId"] as const,
    queryFn: () => authClient.near.getAccountId(),
    enabled: !!session?.user,
    staleTime: 60 * 1000,
  });
  const { data: nearSocialAccount = null, isLoading: isLoadingNearSocial } = useQuery({
    queryKey: nearSocialAccountQueryKey(nearAccountId),
    queryFn: () => getNearSocialAccount(authClient, nearAccountId),
    enabled: !!nearAccountId,
  });
  const { data: twitterAccount = null, isLoading: isLoadingTwitter } = useQuery({
    queryKey: socialAccountsQueryKey,
    queryFn: () => getTwitterConnectedAccount(apiClient),
    enabled: !!session?.user,
  });

  if (!campaign) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 border-b pb-4">
          <div className="mb-4">
            <BackButton />
          </div>
          <h1 className="text-2xl font-bold">GM Campaign</h1>
          <p className="text-muted-foreground">GM Campaign – Post GM from your account.</p>
        </div>
        <Button asChild>
          <Link to="/campaigns">Back to campaigns</Link>
        </Button>
      </div>
    );
  }

  return (
    <CampaignScreen
      campaign={campaign}
      nearSocialAccount={nearSocialAccount}
      twitterAccount={twitterAccount}
      accountsLoading={
        (!!session?.user && (isLoadingNearAccountId || (!!nearAccountId && isLoadingNearSocial))) ||
        (!!session?.user && isLoadingTwitter)
      }
      connectHref="/manage"
      back={<BackButton />}
      onPost={async (input) => {
        if (input.destination === "twitter") {
          if (!session?.user) {
            throw new Error("Sign in with your NEAR wallet, then connect your X account.");
          }
          const result = await postGmToX(apiClient, session.user.id, input.text);
          return {
            destination: "twitter" as const,
            accountId: result.accountId,
            txHash: result.callId,
          };
        }

        try {
          const result = await postToNearSocial(authClient.near, input.text);
          return {
            destination: "near-social" as const,
            accountId: result.accountId,
            txHash: result.txHash,
          };
        } catch (error) {
          if (error instanceof NearSocialStorageRequiredError) {
            throw new Error(
              "Your Near Social account needs a small storage deposit before you can post. Add storage from Manage Accounts, then try again.",
            );
          }
          throw error;
        }
      }}
    />
  );
}
