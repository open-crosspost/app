import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { sessionQueryOptions, useApiClient, useAuthClient } from "@/app";
import {
  connectedAccountsQueryOptions,
  mergeConnectedAccounts,
  nearAccountIdQueryKey,
  nearSocialAccountQueryOptions,
} from "@/lib/social";
import type { EditorContent } from "@/store/drafts-store";
import { useScheduledPostsStore } from "@/store/scheduled-posts-store";
import { useSubmitPost } from "./use-submit-post";

const EXECUTOR_INTERVAL_MS = 15_000;

/**
 * Executes due scheduled posts while the app is open. NEAR Social posting
 * signs with the user's live wallet session, so execution reuses the client
 * submit path — the store's "authentication at execution time" contract.
 */
export function useScheduledPostsExecutor() {
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const { submitPost } = useSubmitPost();
  const executingRef = useRef(false);
  const isEnabled = !!session?.user;

  const executeDuePosts = useCallback(async () => {
    const store = useScheduledPostsStore.getState();
    const due = store.getPendingPosts();
    if (due.length === 0) {
      return;
    }

    const nearAccountId = queryClient.getQueryData<string | null>(nearAccountIdQueryKey);
    const [connectedAccounts, nearSocialAccount] = await Promise.all([
      queryClient.fetchQuery(connectedAccountsQueryOptions(apiClient)),
      nearAccountId
        ? queryClient.fetchQuery(nearSocialAccountQueryOptions(authClient, nearAccountId))
        : Promise.resolve(null),
    ]);
    const allAccounts = mergeConnectedAccounts(connectedAccounts, nearSocialAccount);

    for (const scheduled of due) {
      store.markAsExecuting(scheduled.id);

      const accounts = allAccounts.filter((account) =>
        scheduled.platforms.includes(account.platform),
      );
      if (accounts.length === 0) {
        store.markAsFailed(
          scheduled.id,
          "None of the scheduled platforms have a connected account.",
        );
        continue;
      }

      const outcome = await submitPost(scheduled.posts as EditorContent[], accounts, "post", "");

      if (outcome === "success") {
        store.markAsCompleted(scheduled.id);
      } else if (outcome === "partial-success") {
        store.markAsFailed(scheduled.id, "Partially published — see results for details.");
      } else if (outcome !== "idle") {
        store.markAsFailed(scheduled.id, "Publishing failed — see results for details.");
      } else {
        store.markAsFailed(scheduled.id, "Could not publish the scheduled post.");
      }
    }
  }, [apiClient, authClient, queryClient, submitPost]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let cancelled = false;
    const tick = () => {
      if (cancelled || executingRef.current) {
        return;
      }
      const hasDuePosts = useScheduledPostsStore.getState().getPendingPosts().length > 0;
      if (!hasDuePosts) {
        return;
      }
      executingRef.current = true;
      void executeDuePosts().finally(() => {
        executingRef.current = false;
      });
    };

    void tick();
    const intervalId = window.setInterval(tick, EXECUTOR_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isEnabled, executeDuePosts]);
}
