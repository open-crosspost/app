import type {
  AccountActivityEntry,
  AccountPost,
  ConnectedAccount,
  Platform,
  PlatformName,
  TimePeriod,
} from "@crosspost/plugin/types";
import type { ApiClient } from "@/app";
import type { AuthClient } from "@/lib/auth";
import { getImageUrl } from "@/lib/utils/near-social-node";

export const socialAccountsQueryKey = ["social", "accounts"] as const;

export function socialAccountPostsQueryKey(accountId: string) {
  return ["social", "account-posts", accountId] as const;
}

export function socialLeaderboardQueryKey(params: {
  limit: number;
  offset: number;
  timeframe: TimePeriod;
  startDate?: string;
  endDate?: string;
  platforms?: string[];
}) {
  return ["social", "leaderboard", params] as const;
}

export function nearSocialAccountQueryKey(accountId: string | null | undefined) {
  return ["social", "near-account", accountId ?? null] as const;
}

export async function listConnectedAccounts(apiClient: ApiClient): Promise<ConnectedAccount[]> {
  const response = await apiClient.social.accounts.list();
  return response.accounts;
}

export async function disconnectSocialAccount(
  apiClient: ApiClient,
  platform: PlatformName,
  userId: string,
) {
  return apiClient.social.accounts.disconnect({
    platform: platform as Platform,
    userId,
  });
}

export async function refreshSocialAccount(
  apiClient: ApiClient,
  platform: PlatformName,
  userId: string,
) {
  return apiClient.social.accounts.refresh({
    platform: platform as Platform,
    userId,
  });
}

export async function fetchSocialAccountPosts(
  apiClient: ApiClient,
  accountId: string,
): Promise<AccountPost[]> {
  const response = await apiClient.social.activity.accountPosts({
    signerId: accountId,
  });
  return response.posts;
}

export async function fetchSocialLeaderboard(
  apiClient: ApiClient,
  params: {
    limit: number;
    offset: number;
    timeframe: TimePeriod;
    startDate?: string;
    endDate?: string;
    platforms?: string[];
  },
): Promise<{ entries: AccountActivityEntry[]; meta: { pagination: { total: number } } }> {
  return apiClient.social.activity.leaderboard(params);
}

export async function getNearSocialAccount(
  authClient: AuthClient,
  currentAccountId: string | null | undefined,
): Promise<ConnectedAccount | null> {
  if (!currentAccountId) {
    return null;
  }

  try {
    const response = await authClient.near.getProfile(currentAccountId);
    const profile = response.data ?? null;
    const profileImageUrl = profile?.image ? getImageUrl(profile.image) : "";

    return {
      platform: "Near Social" as Platform,
      userId: currentAccountId,
      connectedAt: "",
      profile: {
        userId: currentAccountId,
        username: profile?.name || currentAccountId,
        profileImageUrl,
        platform: "Near Social" as Platform,
        lastUpdated: Date.now(),
      },
    } as ConnectedAccount;
  } catch (error) {
    console.error("Error getting NEAR Social account profile:", error);
    return null;
  }
}

export function mergeConnectedAccounts(
  apiAccounts: ConnectedAccount[],
  nearSocialAccount: ConnectedAccount | null,
) {
  const merged = [...apiAccounts, ...(nearSocialAccount ? [nearSocialAccount] : [])];
  return merged.filter(
    (account, index) =>
      merged.findIndex(
        (candidate) =>
          candidate.platform === account.platform && candidate.userId === account.userId,
      ) === index,
  );
}
