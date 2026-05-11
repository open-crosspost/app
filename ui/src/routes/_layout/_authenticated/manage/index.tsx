// PlatformName import removed "@crosspost/plugin/types";
import { SUPPORTED_PLATFORMS } from "@crosspost/plugin/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  getNearAccountIdFromSession,
  getNearActions,
  getNearWalletDisplayFromSession,
  sessionQueryKey,
  signInWithNear,
  useApiClient,
  useAuthClient,
} from "@/app";
import { BackButton } from "@/components/back-button";
import { PlatformAccountItem } from "@/components/platform-account";
import { PlatformAccountList } from "@/components/platform-account-list";
import { Button } from "@/components/ui/button";
import { NETWORK_ID } from "@/config";
import {
  getNearSocialAccount,
  listConnectedAccounts,
  nearSocialAccountQueryKey,
  socialAccountsQueryKey,
} from "@/lib/social";
import { convertAtomicToStandard } from "@/lib/utils/string";
import { usePlatformAccountsStore } from "@/store/platform-accounts-store";

const NEAR_SOCIAL_STORAGE_QUERY_KEY = ["social", "near-storage"] as const;
const NEAR_SOCIAL_STORAGE_DEPOSIT = "0.1 NEAR";
const SOCIAL_CONTRACT_ID = NETWORK_ID === "mainnet" ? "social.near" : "v1.social08.testnet";

type SocialStorageBalance = {
  available: string;
  total: string;
} | null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNearSocialStorageBalance(
  near: ReturnType<typeof getNearActions>,
  accountId: string,
): Promise<SocialStorageBalance> {
  return (
    (await near.client.view<SocialStorageBalance>(SOCIAL_CONTRACT_ID, "storage_balance_of", {
      account_id: accountId,
    })) ?? null
  );
}

function formatNearAmount(atomicAmount: string): string {
  const standardAmount = Number(convertAtomicToStandard(atomicAmount, 24));
  return standardAmount.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export const Route = createFileRoute("/_layout/_authenticated/manage/")({
  component: ManageAccountsPage,
});

function ManageAccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const near = getNearActions(authClient);
  const { data: session } = authClient.useSession();
  const connectedNearAccountId = near.getAccountId();
  const nearAccountId = connectedNearAccountId ?? getNearAccountIdFromSession(session);
  const nearWalletDisplay = getNearWalletDisplayFromSession(session);
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: socialAccountsQueryKey,
    queryFn: () => listConnectedAccounts(apiClient),
    enabled: !!session?.user,
  });
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: nearSocialAccountQueryKey(nearAccountId),
    queryFn: () => getNearSocialAccount(nearAccountId),
    enabled: !!nearAccountId,
  });
  const { data: storageBalance, isLoading: isLoadingStorage } = useQuery({
    queryKey: [...NEAR_SOCIAL_STORAGE_QUERY_KEY, nearAccountId],
    queryFn: async () => {
      if (!nearAccountId) return null;

      return await fetchNearSocialStorageBalance(near, nearAccountId);
    },
    enabled: !!nearAccountId,
  });
  const { selectedAccountIds } = usePlatformAccountsStore();

  const connectNearMutation = useMutation({
    mutationFn: async () => {
      if (session?.user && nearAccountId) {
        const connected = await near.ensureConnected();
        if (!connected) {
          throw new Error("Failed to reconnect your NEAR wallet.");
        }
        return;
      }

      await signInWithNear(authClient);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
        queryClient.invalidateQueries({ queryKey: socialAccountsQueryKey }),
        queryClient.invalidateQueries({ queryKey: NEAR_SOCIAL_STORAGE_QUERY_KEY }),
      ]);
      toast.success("Signed in with NEAR");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to sign in with NEAR");
    },
  });

  const addStorageMutation = useMutation({
    mutationFn: async () => {
      const connected = await near.ensureConnected();
      const signerId = near.getAccountId();
      if (!connected || !signerId) {
        throw new Error("Reconnect your NEAR wallet to add storage.");
      }

      await near.client
        .transaction(signerId)
        .functionCall(
          SOCIAL_CONTRACT_ID,
          "storage_deposit",
          {},
          {
            gas: "30 Tgas",
            attachedDeposit: NEAR_SOCIAL_STORAGE_DEPOSIT,
          },
        )
        .send();

      let latestBalance: SocialStorageBalance = storageBalance ?? null;
      const previousTotal = storageBalance ? BigInt(storageBalance.total) : 0n;

      for (let attempt = 0; attempt < 6; attempt++) {
        await sleep(1000);
        latestBalance = await fetchNearSocialStorageBalance(near, signerId);

        if (latestBalance && BigInt(latestBalance.total) > previousTotal) {
          break;
        }
      }

      return latestBalance;
    },
    onSuccess: async (latestBalance) => {
      queryClient.setQueryData([...NEAR_SOCIAL_STORAGE_QUERY_KEY, nearAccountId], latestBalance);
      await queryClient.invalidateQueries({ queryKey: NEAR_SOCIAL_STORAGE_QUERY_KEY });
      toast.success("NEAR Social storage added");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add NEAR Social storage");
    },
  });

  const hasAvailableStorage = storageBalance ? BigInt(storageBalance.available) > 0n : false;

  const handleContinue = () => {
    navigate({ to: "/editor" });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border-b pb-4 mb-6">
        <div className="flex items-center mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-bold">Manage Social Accounts</h1>
        <p className="text-muted-foreground">
          Connect and manage your social media accounts for crossposting
        </p>
      </div>

      <div className="space-y-6">
        {/* NEAR Account Section */}
        <div className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-xl font-semibold">Near Social Account</h2>
          </div>

          {isLoadingProfile || isLoadingStorage ? (
            <div className="flex justify-center py-8">
              <RefreshCw size={16} className={"animate-spin"} />
            </div>
          ) : profile ? (
            <div className="space-y-4 w-full">
              <PlatformAccountItem account={profile} showActions={false} />

              <div className="rounded-md border bg-card p-4 text-card-foreground">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2
                        size={16}
                        className={hasAvailableStorage ? "text-green-600" : "text-muted-foreground"}
                      />
                      {hasAvailableStorage
                        ? "Ready for relayed posts"
                        : "Storage needed before relayed posts"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {hasAvailableStorage
                        ? "Gas is relayed for posts. Your wallet only needs enough NEAR Social storage."
                        : "Posts are relayed gaslessly, but your account still needs NEAR Social storage before posting."}
                    </p>
                    {storageBalance ? (
                      <div className="text-sm text-muted-foreground">
                        <span>Available: {formatNearAmount(storageBalance.available)} NEAR</span>
                        <span className="mx-2">·</span>
                        <span>Total deposited: {formatNearAmount(storageBalance.total)} NEAR</span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No NEAR Social storage deposited yet.
                      </div>
                    )}
                    {!connectedNearAccountId && nearWalletDisplay && (
                      <p className="text-sm text-muted-foreground">
                        Reconnect @{nearWalletDisplay} in this browser before adding storage or
                        relaying posts.
                      </p>
                    )}
                  </div>

                  {connectedNearAccountId ? (
                    <Button
                      onClick={() => addStorageMutation.mutate()}
                      disabled={addStorageMutation.isPending}
                      variant={hasAvailableStorage ? "outline" : "default"}
                    >
                      {addStorageMutation.isPending ? "Adding Storage..." : "Add 0.1 NEAR Storage"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => connectNearMutation.mutate()}
                      disabled={connectNearMutation.isPending}
                    >
                      {connectNearMutation.isPending ? "Connecting..." : "Reconnect NEAR"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border-2 border-dashed border-border p-4 text-center sm:p-8">
              <Wallet size={20} className="mx-auto text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">No NEAR account connected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Please sign in with your NEAR wallet to use NEAR Social
              </p>
              <Button onClick={() => connectNearMutation.mutate()} className="mt-4">
                {connectNearMutation.isPending ? "Connecting..." : "Connect NEAR"}
              </Button>
            </div>
          )}
        </div>

        {/* Other Platform Accounts */}
        {SUPPORTED_PLATFORMS.map((platform) => (
          <PlatformAccountList
            key={platform}
            platform={platform}
            accounts={accounts}
            isLoading={isLoading}
          />
        ))}

        <div className="flex justify-center sm:justify-end pt-4 border-t">
          <Button
            onClick={handleContinue}
            disabled={selectedAccountIds.length === 0}
            className="gap-2 w-full sm:w-auto"
          >
            Continue to Editor
          </Button>
        </div>
      </div>
    </div>
  );
}
