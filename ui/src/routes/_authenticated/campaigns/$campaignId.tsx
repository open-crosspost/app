import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthClient } from "@/app";
import { BackButton } from "@/components/back-button";
import { CampaignScreen } from "@/components/campaign-screen";
import { Button } from "@/components/ui/button";
import { getCampaign } from "@/lib/campaigns";
import { NearSocialStorageRequiredError, postToNearSocial } from "@/lib/near-social-post";
import { getNearSocialAccount, nearSocialAccountQueryKey } from "@/lib/social";

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId")({
  component: CampaignPage,
});

function CampaignPage() {
  const { campaignId } = Route.useParams();
  const campaign = getCampaign(campaignId);
  const authClient = useAuthClient();
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

  if (!campaign) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 border-b pb-4">
          <div className="mb-4">
            <BackButton />
          </div>
          <h1 className="text-2xl font-bold">Campaign not found</h1>
          <p className="text-muted-foreground">That campaign is not available.</p>
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
      accountsLoading={
        !!session?.user && (isLoadingNearAccountId || (!!nearAccountId && isLoadingNearSocial))
      }
      connectHref="/manage"
      back={<BackButton />}
      onPost={async (input) => {
        if (input.destination !== "near-social") {
          throw new Error("That destination is not enabled yet.");
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
