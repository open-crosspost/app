import type { ConnectedAccount, PlatformName } from "@crosspost/plugin/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCopy, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApiClient } from "@/app";
import { AccountItem } from "@/components/account-item";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  disconnectSocialAccount,
  refreshSocialAccount,
  socialAccountsQueryKey,
} from "@/lib/social";
import { capitalize } from "@/lib/utils/string";
import { usePlatformAccountsStore } from "@/store/platform-accounts-store";

interface PlatformAccountProps {
  account: ConnectedAccount;
  showActions?: boolean;
}

export function PlatformAccountItem({ account, showActions = true }: PlatformAccountProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const disconnectAccount = useMutation({
    mutationKey: ["disconnect-social-account", account.platform, account.userId],
    mutationFn: async () =>
      disconnectSocialAccount(apiClient, account.platform as PlatformName, account.userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: socialAccountsQueryKey });
      if (usePlatformAccountsStore.getState().selectedAccountIds.includes(account.userId)) {
        usePlatformAccountsStore.getState().unselectAccount(account.userId);
      }
    },
  });
  const refreshAccount = useMutation({
    mutationKey: ["refresh-social-account", account.platform, account.userId],
    mutationFn: async () =>
      refreshSocialAccount(apiClient, account.platform as PlatformName, account.userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: socialAccountsQueryKey });
    },
  });
  const { toggleAccountSelection, isAccountSelected } = usePlatformAccountsStore();

  const isNearSocial = account.platform?.toLowerCase() === ("near social" as PlatformName);
  const isSelected = isAccountSelected(account.userId);

  const handleRefresh = async () => {
    if (isNearSocial) return; // No refresh for NEAR accounts

    setIsRefreshing(true);
    try {
      await refreshAccount.mutateAsync();
    } catch (error) {
      toast({
        title: "Refresh Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to refresh ${capitalize(account.platform)} account`,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (isNearSocial) return; // No disconnect for NEAR accounts

    setIsDisconnecting(true);
    try {
      await disconnectAccount.mutateAsync();
      toast({
        title: "Account Disconnected",
        description: `Successfully disconnected ${capitalize(account.platform)} account`,
        variant: "default",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to disconnect ${capitalize(account.platform)} account`;

      toast({
        title: "Disconnection Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCopyUserId = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(account.userId);
      toast({
        title: "Copied to Clipboard",
        description: `User ID copied to clipboard`,
      });
    } catch (_error) {
      toast({
        title: "Copy Error",
        description: "Failed to copy user ID to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  // Only show action buttons for non-NEAR accounts and if showActions is true
  const actionButtons =
    !isNearSocial && showActions ? (
      <>
        <Button size="sm" onClick={handleCopyUserId} title="Copy user ID" disabled={isCopying}>
          <ClipboardCopy size={16} className={isCopying ? "animate-spin" : ""} />
        </Button>
        <Button size="sm" onClick={handleRefresh} title="Refresh token" disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
        </Button>
        <Button
          size="sm"
          onClick={handleDisconnect}
          title="Disconnect account"
          disabled={isDisconnecting}
        >
          <Trash2 size={16} className={isDisconnecting ? "animate-spin" : ""} />
        </Button>
      </>
    ) : null;

  return (
    <AccountItem
      account={account}
      isSelected={isSelected}
      onSelect={() => toggleAccountSelection(account.userId)}
      actions={actionButtons}
    />
  );
}
