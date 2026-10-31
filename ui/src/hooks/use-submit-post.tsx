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
import { useState } from "react";
import { toast } from "sonner";
import { useApiClient, useAuthClient } from "@/app";
import type { PostType } from "@/components/post-interaction-selector";
import { connectorErrorDetail, connectorSuccessDetail, postToX } from "@/lib/connector-post";
import { postToNearSocial } from "@/lib/near-social-post";
import { detectPlatformFromUrl } from "@/lib/utils/url-utils";
import type { EditorContent } from "@/store/drafts-store";
import { useSubmissionResultsStore } from "@/store/submission-results-store";

export type SubmitStatus = "idle" | "posting" | "success" | "partial-success" | "failure";

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

  const submitPost = async (
    posts: EditorContent[],
    selectedAccounts: ConnectedAccount[],
    postType: PostType = "post",
    targetUrl: string = "",
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

    // Initial toast
    const uniquePlatforms = new Set([
      ...otherAccounts.map((a) => a.platform),
      ...(nearSocialAccounts.length > 0 ? ["Near Social" as PlatformName] : []),
    ]);
    // totalAccounts for the toast should reflect the number of accounts being processed in *this* attempt
    const totalAccountsForThisAttempt = processingAccounts.length;
    toast("Crossposting...", {
      description: `Publishing to ${uniquePlatforms.size} platform${uniquePlatforms.size > 1 ? "s" : ""} and ${totalAccountsForThisAttempt} account${totalAccountsForThisAttempt > 1 ? "s" : ""}`,
    });

    // Results tracking
    let nearSocialSuccess = true;
    let nearSocialError: any = null;
    let apiResponse: MultiStatusData | null = null;
    let apiError: any = null;
    const connectorResults: SuccessDetail[] = [];
    const connectorErrors: ErrorDetail[] = [];

    // --- Post to NEAR Social (only for regular posts) ---
    if (nearSocialAccounts.length > 0 && postType === "post") {
      try {
        await postToNearSocial(near, nonEmptyPosts.map((post) => post.text).join("\n\n"));
      } catch (error) {
        nearSocialSuccess = false;
        nearSocialError = error;
        console.error("NEAR Social post error:", error);
      }
    }

    // --- Post to X via the connectors bridge (regular posts only) ---
    const twitterAccounts =
      postType === "post"
        ? otherAccounts.filter((account) => account.platform === Platform.TWITTER)
        : [];
    const legacyAccounts =
      postType === "post"
        ? otherAccounts.filter((account) => account.platform !== Platform.TWITTER)
        : [];

    if (twitterAccounts.length > 0) {
      const agentId = session?.user?.id;
      const joinedText = nonEmptyPosts.map((post) => post.text).join("\n\n");
      const hasMedia = nonEmptyPosts.some((post) => (post.media?.length ?? 0) > 0);

      for (const account of twitterAccounts) {
        if (!agentId) {
          connectorErrors.push({
            message: "Sign in with your NEAR wallet, then connect your X account.",
            code: ApiErrorCode.UNAUTHORIZED,
            recoverable: false,
            details: { platform: account.platform, userId: account.userId },
          });
          continue;
        }
        if (hasMedia) {
          connectorErrors.push({
            message: "Media is not yet supported for X posts",
            code: ApiErrorCode.PLATFORM_ERROR,
            recoverable: false,
            details: { platform: account.platform, userId: account.userId },
          });
          continue;
        }
        try {
          const result = await postToX(apiClient, agentId, joinedText);
          connectorResults.push(connectorSuccessDetail(result, account.userId));
        } catch (error) {
          console.error("X connector post error:", error);
          connectorErrors.push(connectorErrorDetail(error, account.userId));
        }
      }
    }

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

    // --- Post to remaining platforms via the legacy API (no live connector path yet) ---
    if (legacyAccounts.length > 0) {
      try {
        const postRequest = {
          targets: legacyAccounts.map((account) => ({
            platform: account.platform,
            userId: account.userId,
          })),
          content: nonEmptyPosts,
        } satisfies CreatePostRequest;

        apiResponse = await apiClient.social.posts.create(postRequest);
      } catch (error) {
        apiError = error;
        console.error("API post error:", error);
      }
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

    const nearSocialResultCount = nearSocialAccounts.length;
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
      (nearSocialSuccess ? nearSocialResultCount : 0) +
      connectorResults.length;
    const totalFailed =
      finalSummary.failed +
      (!nearSocialSuccess ? nearSocialResultCount : 0) +
      connectorErrors.length;
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
  };
}
