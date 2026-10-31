import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { sessionQueryOptions, useApiClient, useAuthClient } from "@/app";
import {
  connectedAccountsQueryOptions,
  type JobTargetPlatform,
  jobRunsBaseQueryKey,
  mergeConnectedAccounts,
  nearAccountIdQueryKey,
  nearSocialAccountQueryOptions,
} from "@/lib/social";
import type { EditorContent } from "@/store/drafts-store";
import { useSubmitPost } from "./use-submit-post";

const EXECUTOR_INTERVAL_MS = 15_000;
const LOCAL_MIGRATION_FLAG = "crosspost-scheduled-posts:migrated:v2";
const LOCAL_STORE_KEY = "crosspost-scheduled-posts";

/**
 * Executes due scheduled runs while the app is open. Runs live server-side;
 * the client atomically claims due runs that need client-side execution (NEAR
 * Social signs with the live wallet session) and publishes them through the
 * regular submit path. The server-side tick will take over X legs in phase 2.
 */
export function useScheduledPostsExecutor() {
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const queryClient = useQueryClient();
  const { data: session } = useQuery(sessionQueryOptions(authClient));
  const { submitPost } = useSubmitPost();
  const executingRef = useRef(false);
  const isEnabled = !!session?.user;

  const importLocalScheduleOnce = useCallback(async () => {
    if (localStorage.getItem(LOCAL_MIGRATION_FLAG) === "1") {
      return;
    }
    try {
      localStorage.setItem(LOCAL_MIGRATION_FLAG, "1");
      const parsed: unknown = JSON.parse(localStorage.getItem(LOCAL_STORE_KEY) ?? "null");

      const rows =
        (parsed as { state?: { scheduledPosts?: Array<Record<string, unknown>> } })?.state
          ?.scheduledPosts ?? [];

      const cachedAccounts =
        (queryClient.getQueryData(connectedAccountsQueryOptions(apiClient).queryKey) as
          | Array<{ platform: string; userId: string; error?: string }>
          | undefined) ?? [];
      const cachedNearId =
        queryClient.getQueryData<string | null | undefined>(nearAccountIdQueryKey) ?? null;

      for (const row of rows) {
        if (
          typeof row.scheduledFor !== "string" ||
          new Date(row.scheduledFor) <= new Date() ||
          !Array.isArray(row.posts)
        ) {
          continue;
        }

        const targets = mapImportedPlatformsToTargets(row, cachedAccounts, cachedNearId);
        if (targets.length === 0) {
          continue;
        }

        try {
          await apiClient.social.jobs.specs.create({
            kind: "scheduled",
            posts: row.posts.map((post) => ({
              text: typeof post?.text === "string" ? post.text : "",
              media: [],
            })),
            targets,
            schedule: { mode: "once", at: new Date(row.scheduledFor).toISOString() },
          });
        } catch {}
      }

      await queryClient.invalidateQueries({ queryKey: jobRunsBaseQueryKey });
    } catch {
      localStorage.setItem(LOCAL_MIGRATION_FLAG, "1");
    }
  }, [apiClient, queryClient]);

  const executeDueRuns = useCallback(async () => {
    const [{ runs: pendingRuns }, { runs: signatureRuns }] = await Promise.all([
      apiClient.social.jobs.runs.list({ due: true, status: "pending" }),
      apiClient.social.jobs.runs.list({ due: true, status: "needs_signature" }),
    ]);
    const runs = [...pendingRuns, ...signatureRuns];
    if (runs.length === 0) {
      return;
    }

    const nearAccountId = queryClient.getQueryData<string | null>(nearAccountIdQueryKey);
    const [connectedAccounts, nearSocialAccount] = await Promise.all([
      queryClient.fetchQuery(connectedAccountsQueryOptions(apiClient)),
      nearAccountId
        ? queryClient.fetchQuery(nearSocialAccountQueryOptions(authClient, nearAccountId ?? null))
        : Promise.resolve(null),
    ]);
    const allAccounts = mergeConnectedAccounts(connectedAccounts, nearSocialAccount);

    for (const run of runs) {
      const expectedStatus = run.status === "needs_signature" ? "needs_signature" : "pending";
      let claimed: Awaited<ReturnType<typeof apiClient.social.jobs.runs.claim>> | undefined;
      try {
        claimed = await apiClient.social.jobs.runs.claim({
          runId: run.id,
          expectedStatus,
        });
      } catch {
        continue;
      }

      const accounts = allAccounts.filter((account) =>
        accountMatchesRunTarget(account, claimed.targets),
      );

      if (accounts.length === 0) {
        await apiClient.social.jobs.runs
          .report({
            runId: claimed.id,
            status: "failed",
            error: "None of the run's profiles are connected in this browser.",
          })
          .catch(() => undefined);
        continue;
      }

      const outcome = await submitPost(postsForRun(claimed.posts), accounts, "post", "");

      const reportStatus = outcome === "success" ? ("completed" as const) : ("failed" as const);
      const reportError =
        reportStatus === "failed"
          ? outcome === "partial-success"
            ? "Partially published — see results for details."
            : "Publishing failed — see results for details."
          : undefined;

      await apiClient.social.jobs.runs
        .report({
          runId: claimed.id,
          status: reportStatus,
          result: reportStatus === "completed" ? { posts: claimed.posts ?? [] } : undefined,
          error: reportError,
        })
        .catch(() => undefined);
    }

    await queryClient.invalidateQueries({ queryKey: jobRunsBaseQueryKey });
  }, [apiClient, authClient, queryClient, submitPost]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    void importLocalScheduleOnce();

    let cancelled = false;
    const tick = () => {
      if (cancelled || executingRef.current) {
        return;
      }
      executingRef.current = true;
      void executeDueRuns().finally(() => {
        executingRef.current = false;
      });
    };

    void tick();
    const intervalId = window.setInterval(tick, EXECUTOR_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isEnabled, executeDueRuns, importLocalScheduleOnce]);
}

function accountMatchesRunTarget(
  account: { platform: string; userId: string },
  targets: Array<{ platform: string; accountUserId: string }>,
): boolean {
  return targets.some((target) => target.accountUserId === account.userId);
}

function postsForRun(posts: Array<{ text?: string }> | null): EditorContent[] {
  return (posts ?? []).map((post) => ({ text: post.text ?? "", media: [] }));
}

type ImportRow = Record<string, unknown>;

function mapImportedPlatformsToTargets(
  row: ImportRow,
  accounts: Array<{ platform: string; userId: string; error?: string }>,
  nearAccountId: string | null,
): Array<{ platform: JobTargetPlatform; accountUserId: string }> {
  const platforms = ((row.platforms as string[] | undefined) ?? []).filter(
    (platform) => typeof platform === "string",
  );
  const targets: Array<{ platform: JobTargetPlatform; accountUserId: string }> = [];

  for (const platform of platforms) {
    if (platform === "Near Social") {
      if (nearAccountId) {
        targets.push({ platform: "near-social", accountUserId: nearAccountId });
      }
      continue;
    }
    for (const account of accounts) {
      if (account.platform === platform && !account.error) {
        targets.push({ platform: "twitter", accountUserId: account.userId });
      }
    }
  }

  return targets;
}
