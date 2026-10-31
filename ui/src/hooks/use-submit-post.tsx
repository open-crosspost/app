import {
  ApiErrorCode,
  type ConnectedAccount,
  type CreatePostRequest,
  type ErrorDetail,
  type MultiStatusData,
  Platform,
  type PlatformName,
  type SuccessDetail,
} from "@crosspost/plugin/types";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useApiClient, useAuthClient } from "@/app";
import type { NearSocialFallbackChoice } from "@/components/near-social-fallback-dialog";
import type { PostType } from "@/components/post-interaction-selector";
import { connectorErrorDetail, connectorSuccessDetail, postToX } from "@/lib/connector-post";
import { extractGateRefusal, XPOST_GUARD_ANCHOR_ID } from "@/lib/gate";
import {
  directFallbackEnabled,
  type NearSocialReplyRef,
  postToNearSocial,
  postToNearSocialDirect,
  RelayerUnavailableError,
  rememberDirectFallback,
} from "@/lib/near-social-post";
import { detectPlatformFromUrl } from "@/lib/utils/url-utils";
import type { EditorContent } from "@/store/drafts-store";
import { useGateStore } from "@/store/gate-store";
import { useSubmissionResultsStore } from "@/store/submission-results-store";

export type SubmitStatus = "idle" | "posting" | "success" | "partial-success" | "failure";

export type CampaignThreadRefs = {
  near?: NearSocialReplyRef;
  xSeedTweetId?: string;
};

export interface SubmitResult {
  status: SubmitStatus;
  summary?: {
    total: number;
    succeeded: number;
    failed: number;
  };
  results?: SuccessDetail[];
  errors?: ErrorDetail[];
}

/**
 * Hook to manage the post submission process across platforms
 */
export function useSubmitPost() {
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const near = authClient.near;
  const { data: session } = authClient.useSession();
  const isSignedIn = !!session?.user;
  const navigate = useNavigate();
  const { setSubmissionOutcome } = useSubmissionResultsStore();
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [result, setResult] = useState<SubmitResult>({ status: "idle" });
  const [fallbackRequest, setFallbackRequest] = useState<{
    reason: string;
    resolve: (choice: NearSocialFallbackChoice) => void;
  } | null>(null);

  const requestFallbackChoice = (reason: string) =>
    new Promise<NearSocialFallbackChoice>((resolve) => setFallbackRequest({ reason, resolve }));

  const resolveFallback = useCallback((choice: NearSocialFallbackChoice) => {
    setFallbackRequest((current) => {
      current?.resolve(choice);
      return null;
    });
  }, []);

  const submitPost = async (
    posts: EditorContent[],
    selectedAccounts: ConnectedAccount[],
    postType: PostType = "post",
    targetUrl: string = "",
    campaignThread?: CampaignThreadRefs,
  ): Promise<SubmitStatus> => {
    let processingAccounts = [...selectedAccounts];

    if (!isSignedIn) {
      toast.error("Error", { description: "Wallet not connected." });
      setStatus("failure");
      setResult({ status: "failure" });
      return "failure";
    }

    const nonEmptyPosts = posts.filter((p) => (p.text || "").trim());
    if (nonEmptyPosts.length === 0) {
      toast.error("Empty Post", { description: "Please enter your post text" });
      setStatus("idle");
      return "idle";
    }

    if (processingAccounts.length === 0) {
      toast.error("Error", { description: "Please select at least one account to post to" });
      setStatus("idle");
      return "idle";
    }

    setStatus("posting");
    setResult({ status: "posting" });

    // For quote or reply, validate the URL and filter accounts by platform
    if ((postType === "quote" || postType === "reply") && targetUrl) {
      const detectedPlatform = detectPlatformFromUrl(targetUrl);

      if (!detectedPlatform) {
        toast.error("Invalid URL", {
          description: "Could not detect platform from the provided URL",
        });
        setStatus("failure");
        setResult({ status: "failure" });
        return "failure";
      }

      // Filter accounts to only include those from the detected platform
      processingAccounts = processingAccounts.filter(
        (account) => account.platform === detectedPlatform,
      );

      if (processingAccounts.length === 0) {
        toast.error("No Compatible Accounts", {
          description: `Please select at least one ${detectedPlatform} account to ${postType}`,
        });
        setStatus("failure");
        setResult({ status: "failure" });
        return "failure";
      }
    }

    // Separate NEAR Social accounts - only used for regular posts
    const nearSocialAccounts =
      postType === "post"
        ? processingAccounts.filter(
            (account) => account.platform === ("Near Social" as PlatformName),
          )
        : [];

    const otherAccounts =
      postType === "post"
        ? processingAccounts.filter(
            (account) => account.platform !== ("Near Social" as PlatformName),
          )
        : processingAccounts;

    const twitterAccounts =
      postType === "post"
        ? otherAccounts.filter((account) => account.platform === Platform.TWITTER)
        : [];
    const legacyAccounts =
      postType === "post"
        ? otherAccounts.filter((account) => account.platform !== Platform.TWITTER)
        : [];

    // Progress toast — only meaningful for regular posts, where targets are
    // actually sent to. Replies/quotes short-circuit into honest errors below.
    const sendableTargets = postType === "post" ? processingAccounts.length : 0;
    const progressId =
      sendableTargets > 0
        ? toast.loading("Crossposting…", { description: `0/${sendableTargets} processed` })
        : null;
    let processedTargets = 0;
    const tickProgress = (count = 1) => {
      if (!progressId) return;
      processedTargets += count;
      toast.loading("Crossposting…", {
        id: progressId,
        description: `${processedTargets}/${sendableTargets} processed`,
      });
    };

    // Results tracking
    let nearSocialSuccess = true;
    let nearSocialError: any = null;
    let nearSocialSkipped = 0;
    let apiResponse: MultiStatusData | null = null;
    let apiError: any = null;
    const connectorResults: SuccessDetail[] = [];
    const connectorErrors: ErrorDetail[] = [];

    const joinedText = nonEmptyPosts.map((post) => post.text).join("\n\n");

    // --- NEAR Social leg (regular posts only) — resolves via the fallback
    // modal when the relayer is unavailable; other legs run meanwhile ---
    const runNearSocialLeg = async (): Promise<{ skipped: number; error: unknown }> => {
      if (nearSocialAccounts.length === 0 || postType !== "post") {
        return { skipped: 0, error: null };
      }
      const onRejected = (reason: string) => {
        toast.error("NEAR Social write rejected", { description: reason });
      };
      try {
        await postToNearSocial(near, joinedText, onRejected, campaignThread?.near);
        tickProgress(nearSocialAccounts.length);
        return { skipped: 0, error: null };
      } catch (error) {
        if (error instanceof RelayerUnavailableError) {
          const choice = directFallbackEnabled()
            ? "direct"
            : await requestFallbackChoice(error.message);
          if (choice === "skip") {
            tickProgress(nearSocialAccounts.length);
            toast("NEAR Social skipped", { description: error.message });
            return { skipped: nearSocialAccounts.length, error: null };
          }
          rememberDirectFallback();
          try {
            await postToNearSocialDirect(near, joinedText, onRejected, campaignThread?.near);
            tickProgress(nearSocialAccounts.length);
            return { skipped: 0, error: null };
          } catch (directError) {
            console.error("NEAR Social direct post error:", directError);
            tickProgress(nearSocialAccounts.length);
            return { skipped: 0, error: directError };
          }
        }
        console.error("NEAR Social post error:", error);
        tickProgress(nearSocialAccounts.length);
        return { skipped: 0, error };
      }
    };

    // --- X leg via the connectors bridge — one concurrent call per account ---
    const agentId = session?.user?.id;
    const hasMedia = nonEmptyPosts.some((post) => (post.media?.length ?? 0) > 0);
    const runXLeg = async (account: ConnectedAccount): Promise<void> => {
      if (!agentId) {
        connectorErrors.push({
          message: "Sign in with your NEAR wallet, then connect your X account.",
          code: ApiErrorCode.UNAUTHORIZED,
          recoverable: false,
          details: { platform: account.platform, userId: account.userId },
        });
        tickProgress();
        return;
      }
      if (hasMedia) {
        connectorErrors.push({
          message: "Media is not yet supported for X posts",
          code: ApiErrorCode.PLATFORM_ERROR,
          recoverable: false,
          details: { platform: account.platform, userId: account.userId },
        });
        tickProgress();
        return;
      }
      try {
        const result = await postToX(apiClient, agentId, joinedText, campaignThread?.xSeedTweetId);
        connectorResults.push(connectorSuccessDetail(result, account));
      } catch (error) {
        console.error("X connector post error:", error);
        const gateRefusal = extractGateRefusal(error);
        if (gateRefusal) {
          useGateStore.getState().setRefusal(XPOST_GUARD_ANCHOR_ID, gateRefusal);
        }
        connectorErrors.push(connectorErrorDetail(error, account));
      }
      tickProgress();
    };

    // --- Legacy API leg (remaining platforms, single batched request) ---
    const runLegacyLeg = async (): Promise<{
      response: MultiStatusData | null;
      error: unknown;
    }> => {
      if (legacyAccounts.length === 0) return { response: null, error: null };
      try {
        const postRequest = {
          targets: legacyAccounts.map((account) => ({
            platform: account.platform,
            userId: account.userId,
          })),
          content: nonEmptyPosts,
        } satisfies CreatePostRequest;

        return { response: await apiClient.social.posts.create(postRequest), error: null };
      } catch (error) {
        console.error("API post error:", error);
        return { response: null, error };
      } finally {
        tickProgress(legacyAccounts.length);
      }
    };

    // All legs run concurrently — legs never reject (each catches internally)
    const [nearSocialOutcome, legacyOutcome] = await Promise.all([
      runNearSocialLeg(),
      runLegacyLeg(),
      Promise.all(twitterAccounts.map(runXLeg)),
    ]);
    nearSocialSuccess = !nearSocialOutcome.error;
    nearSocialSkipped = nearSocialOutcome.skipped;
    nearSocialError = nearSocialOutcome.error;
    apiResponse = legacyOutcome.response;
    apiError = legacyOutcome.error;

    // --- Replies/quotes have no working backend for non-NEAR platforms yet ---
    if (postType !== "post") {
      for (const account of otherAccounts) {
        connectorErrors.push({
          message:
            "Replies and quotes are not yet supported for this platform — regular posts only",
          code: ApiErrorCode.PLATFORM_ERROR,
          recoverable: false,
          details: { platform: account.platform, userId: account.userId },
        });
      }
    }

    if (progressId) {
      toast.dismiss(progressId);
    }

    // --- Process Results ---
    let finalStatus: SubmitStatus = "idle";
    let finalSummary = {
      total: 0,
      succeeded: 0,
      failed: 0,
    };
    let finalResults: SuccessDetail[] = [];
    let finalErrors: ErrorDetail[] = [];

    const nearSocialAttempted = nearSocialAccounts.length - nearSocialSkipped;
    const apiResultCount = legacyAccounts.length;

    // Process API results
    if (apiResponse) {
      finalSummary = apiResponse.summary;
      finalResults = apiResponse.results || [];
      finalErrors = apiResponse.errors || [];
    } else if (apiError) {
      finalSummary = {
        total: apiResultCount,
        succeeded: 0,
        failed: apiResultCount,
      };

      if (legacyAccounts.length > 0) {
        finalErrors = legacyAccounts.map((acc) => ({
          message:
            apiError instanceof Error ? apiError.message : "Posting failed for this account.",
          code: ApiErrorCode.PLATFORM_ERROR,
          recoverable: false,
          details: {
            platform: acc.platform,
            userId: acc.userId,
          },
        }));
      } else {
        finalErrors.push({
          message: apiError instanceof Error ? apiError.message : "An unknown error occurred.",
          code: ApiErrorCode.UNKNOWN_ERROR,
          recoverable: false,
          details: {},
        });
      }
    }

    // Fold in connector-bridge results
    finalResults = [...finalResults, ...connectorResults];
    finalErrors = [...finalErrors, ...connectorErrors];

    // Combine NEAR Social results
    const totalSucceeded =
      finalSummary.succeeded +
      (nearSocialSuccess ? nearSocialAttempted : 0) +
      connectorResults.length;
    const totalFailed =
      finalSummary.failed + (!nearSocialSuccess ? nearSocialAttempted : 0) + connectorErrors.length;
    const totalAttempted = totalSucceeded + totalFailed;

    const combinedSummary = {
      total: totalAttempted,
      succeeded: totalSucceeded,
      failed: totalFailed,
    };

    // Add NEAR Social errors if any
    if (!nearSocialSuccess && nearSocialAccounts.length > 0) {
      nearSocialAccounts.forEach((acc) => {
        finalErrors.push({
          message: nearSocialError?.message || "NEAR Social post failed",
          code: ApiErrorCode.PLATFORM_ERROR,
          recoverable: false,
          details: {
            platform: acc.platform,
            userId: acc.userId,
          },
        });
      });
    }

    // Add NEAR Social successes if any
    if (nearSocialSuccess && nearSocialAccounts.length > 0) {
      nearSocialAccounts.forEach((acc) => {
        finalResults.push({
          platform: acc.platform,
          userId: acc.userId,
          status: "success",
          details: { message: "Successfully posted to NEAR Social" },
        });
      });
    }

    // Determine final status
    if (totalSucceeded === totalAttempted && totalAttempted > 0) {
      finalStatus = "success";
    } else if (totalSucceeded > 0 && totalFailed > 0) {
      finalStatus = "partial-success";
    } else if (totalFailed === totalAttempted && totalAttempted > 0) {
      finalStatus = "failure";
    } else {
      finalStatus = "idle";
    }

    setStatus(finalStatus);
    const submissionOutcomeData = {
      status: finalStatus,
      summary: combinedSummary,
      results: finalResults,
      errors: finalErrors,
    };
    setResult(submissionOutcomeData);

    // Store the detailed outcome
    const submissionRequest = {
      posts: nonEmptyPosts,
      selectedAccounts: selectedAccounts,
      postType: postType,
      targetUrl: targetUrl || undefined,
    };
    setSubmissionOutcome({
      summary: combinedSummary,
      results: finalResults,
      errors: finalErrors,
      request: submissionRequest,
    });

    if (finalStatus === "success") {
      toast.success("Success!", {
        description: `Your post has been published successfully to all ${combinedSummary.total} account${combinedSummary.total > 1 ? "s" : ""}.`,
      });
    } else if (finalStatus === "partial-success") {
      toast("Partial Success", {
        description: `Posted to ${combinedSummary.succeeded} of ${combinedSummary.total} accounts.`,
        action: { label: "See Results", onClick: () => navigate({ to: "/results" }) },
      });
    } else if (finalStatus === "failure") {
      toast.error("Post Failed", {
        description: `Failed to publish post to any of the ${combinedSummary.total} selected account${combinedSummary.total > 1 ? "s" : ""}.`,
        action: { label: "See Details", onClick: () => navigate({ to: "/results" }) },
      });
    } else if (
      finalStatus === "idle" &&
      totalAttempted === 0 &&
      nonEmptyPosts.length > 0 &&
      processingAccounts.length === 0 &&
      selectedAccounts.length > 0
    ) {
      // This case means all initially selected accounts were filtered out (e.g. for quote/reply)
      toast("No Compatible Accounts", {
        description: "None of your selected accounts are compatible with this action.",
      });
    }

    return finalStatus;
  };

  return {
    status,
    result,
    submitPost,
    isPosting: status === "posting",
    nearSocialFallbackReason: fallbackRequest?.reason ?? null,
    resolveNearSocialFallback: resolveFallback,
  };
}
