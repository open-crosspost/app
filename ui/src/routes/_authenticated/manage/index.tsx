// PlatformName import removed "@crosspost/plugin/types";
import { Platform, SUPPORTED_PLATFORMS } from "@crosspost/plugin/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, RefreshCw, Wallet } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { pluginPath, sessionQueryKey, useApiClient, useAuthClient } from "@/app";
import { BackButton } from "@/components/back-button";
import { PlatformAccountItem } from "@/components/platform-account";
import { PlatformAccountList } from "@/components/platform-account-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NETWORK_ID } from "@/config";
import {
  getNearSocialAccount,
  isPlatformConnectable,
  listConnectedAccounts,
  nearSocialAccountQueryKey,
  socialAccountsQueryKey,
  X_CONNECT_CALLBACK_PATH,
  X_CONNECT_WALLET_KEY_STORAGE_KEY,
} from "@/lib/social";
import { usePlatformAccountsStore } from "@/store/platform-accounts-store";

export const Route = createFileRoute("/_authenticated/manage/")({
  component: ManageAccountsPage,
});

function ManageAccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const near = authClient.near;
  const { data: session } = authClient.useSession();
  const connectedNearAccountId = near.getAccountId();
  const { data: nearAccountId } = useQuery({
    queryKey: ["near", "accountId"] as const,
    queryFn: () => near.getAccountId(),
    enabled: !!session?.user,
    staleTime: 60 * 1000,
  });
  const nearWalletDisplay = session?.user?.name ?? null;
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: socialAccountsQueryKey,
    queryFn: () => listConnectedAccounts(apiClient),
    enabled: !!session?.user,
  });
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: nearSocialAccountQueryKey(nearAccountId),
    queryFn: () => getNearSocialAccount(authClient, nearAccountId),
    enabled: !!nearAccountId,
  });
  const { data: gateStatus } = useQuery({
    queryKey: ["connectors", "xpostGateStatus"] as const,
    queryFn: () => apiClient.connectors.xpostGateStatus(),
    staleTime: 60 * 1000,
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

      await authClient.signIn.near();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["near", "accountId"] as const }),
        queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
        queryClient.invalidateQueries({ queryKey: socialAccountsQueryKey }),
      ]);
      toast.success("Signed in with NEAR");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to sign in with NEAR");
    },
  });

  const [isXConnectOpen, setXConnectOpen] = useState(false);
  const [walletApiKey, setWalletApiKey] = useState("");

  const startXConnect = async (byoWalletApiKey?: string) => {
    if (byoWalletApiKey) {
      sessionStorage.setItem(X_CONNECT_WALLET_KEY_STORAGE_KEY, byoWalletApiKey);
    }

    const result = await apiClient.social.accounts.connect({
      platform: Platform.TWITTER,
      redirectUri: window.location.origin + X_CONNECT_CALLBACK_PATH,
    });

    if (result.status !== "redirect" || !result.url) {
      throw new Error(result.message || "X account connection is unavailable right now.");
    }

    window.location.assign(result.url);
  };

  const connectXMutation = useMutation({
    mutationFn: () => startXConnect(),
    onError: (error) => {
      toast.error(error.message || "Failed to start X account connection");
    },
  });

  const byoConnectXMutation = useMutation({
    mutationFn: (key: string) => startXConnect(key),
    onError: (error) => {
      sessionStorage.removeItem(X_CONNECT_WALLET_KEY_STORAGE_KEY);
      toast.error(error.message || "Failed to start X account connection");
    },
  });

  const handleXConnectOpenChange = (open: boolean) => {
    setXConnectOpen(open);
    if (!open) {
      setWalletApiKey("");
    }
  };

  const handleXConnectSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const key = walletApiKey.trim();
    if (!key) return;
    byoConnectXMutation.mutate(key);
  };

  const handleContinue = () => {
    navigate({ to: "/editor" });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
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

          {isLoadingProfile ? (
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
                      <CheckCircle2 size={16} className="text-muted-foreground" />
                      Ready for relayed posts
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Posts publish through the gasless relayer — no storage deposit needed.
                      {NETWORK_ID !== "mainnet"
                        ? " NEAR Social posting itself is mainnet-only."
                        : ""}
                    </p>
                    {!connectedNearAccountId && nearWalletDisplay && (
                      <p className="text-sm text-muted-foreground">
                        Reconnect @{nearWalletDisplay} in this browser before relaying posts.
                      </p>
                    )}
                  </div>

                  {!connectedNearAccountId && nearWalletDisplay ? (
                    <Button
                      onClick={() => connectNearMutation.mutate()}
                      disabled={connectNearMutation.isPending}
                    >
                      {connectNearMutation.isPending ? "Connecting..." : "Reconnect NEAR"}
                    </Button>
                  ) : null}
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
              <Button asChild className="mt-4">
                <Link to={pluginPath("/login")}>Connect NEAR</Link>
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
            onConnect={
              isPlatformConnectable(platform) ? () => connectXMutation.mutate() : undefined
            }
          />
        ))}

        {gateStatus?.enabled && (
          <p className="text-sm text-muted-foreground">
            {gateStatus.caller.tier
              ? `Sponsored posting: XPOST Tier ${gateStatus.caller.tier} of 3`
              : `Sponsored posting needs ${gateStatus.tier1} XPOST — you hold ${gateStatus.caller.balance ?? "0"}.`}
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          By default the app pays for posting — no keys needed.{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => setXConnectOpen(true)}
          >
            Advanced: use your own OutLayer wallet
          </button>
        </p>

        <Dialog open={isXConnectOpen} onOpenChange={handleXConnectOpenChange}>
          <DialogContent className="border bg-background text-foreground">
            <form onSubmit={handleXConnectSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Connect X Account</DialogTitle>
                <DialogDescription>
                  Your key is kept in this browser tab only until the connection completes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="outlayer-wallet-api-key">
                  Paste your OutLayer wallet API key (wk_…)
                </Label>
                <Input
                  id="outlayer-wallet-api-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="wk_…"
                  value={walletApiKey}
                  onChange={(event) => setWalletApiKey(event.target.value)}
                  disabled={byoConnectXMutation.isPending}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => handleXConnectOpenChange(false)}
                  disabled={byoConnectXMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!walletApiKey.trim() || byoConnectXMutation.isPending}
                >
                  {byoConnectXMutation.isPending ? "Redirecting..." : "Continue to X"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
