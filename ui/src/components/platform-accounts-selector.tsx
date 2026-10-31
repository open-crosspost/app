import type { ConnectedAccount, PlatformName } from "@crosspost/plugin/types";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useApiClient, useAuthClient } from "@/app";
import { AccountItem } from "@/components/account-item";
import { Button } from "@/components/ui/button";
import {
  getNearSocialAccount,
  listConnectedAccounts,
  mergeConnectedAccounts,
  nearSocialAccountQueryKey,
  socialAccountsQueryKey,
} from "@/lib/social";
import { usePlatformAccountsStore } from "@/store/platform-accounts-store";

interface PlatformAccountsSelectorProps {
  disabledPlatforms?: PlatformName[];
}

function accountsLoadMessage(error: unknown): {
  title: string;
  body: string;
  isAuth: boolean;
} {
  const raw = error instanceof Error ? error.message : "";
  if (/authentication required|unauthorized|401|session|forbidden/i.test(raw)) {
    return {
      title: "Sign in required",
      body: "Your session expired. Sign in again to see your connected accounts.",
      isAuth: true,
    };
  }

  return {
    title: "Couldn't load accounts",
    body: "Something went wrong while loading your accounts. Please try again.",
    isAuth: false,
  };
}

export function PlatformAccountsSelector({
  disabledPlatforms = [],
}: PlatformAccountsSelectorProps) {
  const navigate = useNavigate();
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const { data: session } = authClient.useSession();
  const { data: nearAccountId } = useQuery({
    queryKey: ["near", "accountId"] as const,
    queryFn: () => authClient.near.getAccountId(),
    enabled: !!session?.user,
    staleTime: 60 * 1000,
  });
  const { toggleAccountSelection, isAccountSelected } = usePlatformAccountsStore();
  const {
    data: connectedAccounts = [],
    isLoading,
    error: globalError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: socialAccountsQueryKey,
    queryFn: () => listConnectedAccounts(apiClient),
    enabled: !!session?.user,
  });
  const { data: nearSocialAccount } = useQuery({
    queryKey: nearSocialAccountQueryKey(nearAccountId),
    queryFn: () => getNearSocialAccount(authClient, nearAccountId),
    enabled: !!nearAccountId,
  });
  const allAccounts = mergeConnectedAccounts(connectedAccounts, nearSocialAccount ?? null);

  const handleConnectAccounts = () => {
    navigate({ to: "/manage" });
  };

  const handleSignIn = () => {
    navigate({ to: "/login", search: { redirect: "/editor" } });
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-md border-2 border-border p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Connected Accounts</h3>
          <Button size="sm" onClick={handleConnectAccounts}>
            Manage
          </Button>
        </div>
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (globalError && allAccounts.length === 0) {
    const { title, body, isAuth } = accountsLoadMessage(globalError);
    return (
      <div
        className="flex w-full gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 sm:p-4"
        role="alert"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-destructive">{title}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAuth ? (
              <Button size="sm" onClick={handleSignIn}>
                Sign in
              </Button>
            ) : (
              <Button size="sm" onClick={() => void refetch()} disabled={isFetching}>
                {isFetching ? "Retrying…" : "Try again"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleConnectAccounts}>
              Manage accounts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (allAccounts.length === 0) {
    return (
      <div className="w-full rounded-md border-2 border-border p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Connected Accounts</h3>
        </div>
        <div className="py-4 text-center">
          <p className="mb-4 text-muted-foreground">No accounts connected yet</p>
          <Button onClick={handleConnectAccounts}>Connect Accounts</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border-2 border-border p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">Post to</h3>
        <Button size="sm" onClick={handleConnectAccounts}>
          Manage
        </Button>
      </div>

      {globalError ? (
        <div
          className="mb-3 flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3"
          role="status"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Some accounts couldn’t be loaded. You can still post with the accounts shown below.
          </p>
        </div>
      ) : null}

      <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {allAccounts.map((account: ConnectedAccount) => {
          const isPlatformDisabled = disabledPlatforms.includes(account.platform);
          const accountHasError = !!account.error;

          let itemTitle: string | undefined;
          let itemDisabled = isPlatformDisabled;

          if (accountHasError) {
            itemTitle = `Error with ${account.platform} account: ${account.error}`;
            itemDisabled = true;
          } else if (isPlatformDisabled) {
            itemTitle = `${account.platform} is disabled for this interaction type`;
          }
          return (
            <AccountItem
              key={account.userId}
              account={account}
              isSelected={isAccountSelected(account.userId)}
              onSelect={() => {
                if (!itemDisabled) {
                  toggleAccountSelection(account.userId);
                }
              }}
              variant="compact"
              disabled={itemDisabled}
              title={itemTitle}
              hasError={accountHasError}
            />
          );
        })}
      </div>
    </div>
  );
}
