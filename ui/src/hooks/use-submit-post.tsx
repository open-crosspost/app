import {
  ApiErrorCode,
  type ConnectedAccount,
  type CreatePostRequest,
  type ErrorDetail,
  type MultiStatusData,
  type PlatformName,
  type QuotePostRequest,
  type ReplyToPostRequest,
  type SuccessDetail,
} from "@crosspost/plugin/types";
import { useNavigate } from "@tanstack/react-router";
import { calculateRequiredDeposit, extractHashtags, extractMentions } from "near-social-js";
import { useState } from "react";
import { getNearActions, useApiClient, useAuthClient } from "@/app";
import type { PostType } from "@/components/post-interaction-selector";
import { ToastAction } from "@/components/ui/toast";
import { NETWORK_ID } from "@/config";
import { toast } from "@/hooks/use-toast";
import { detectPlatformFromUrl, extractPostIdFromUrl } from "@/lib/utils/url-utils";
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

const SOCIAL_CONTRACT_ID = NETWORK_ID === "mainnet" ? "social.near" : "v1.social08.testnet";

type SocialStorageBalance = {
  available: string;
  total: string;
} | null;

function buildNearSocialPostData(
  accountId: string,
  text: string,
): Record<string, Record<string, unknown>> {
  const mentions = extractMentions(text);
  const hashtags = extractHashtags(text);
  const data: Record<string, Record<string, unknown>> = {
    [accountId]: {
      post: {
        main: JSON.stringify({ text, type: "md" }),
      },
      index: {
        post: JSON.stringify({
          key: "main",
          value: { type: "md" },
        }),
      },
    },
  };

  if (hashtags.length > 0) {
    const hashtagIndexes = hashtags.map((tag) => ({
      key: tag,
      value: {
        type: "hashtag",
        path: `${accountId}/post/main`,
      },
    }));

    data[accountId].index = {
      ...(data[accountId].index as Record<string, unknown>),
      hashtag: JSON.stringify(hashtagIndexes.length === 1 ? hashtagIndexes[0] : hashtagIndexes),
    };
  }

  for (const mentionedAccount of mentions) {
    if (mentionedAccount === accountId) continue;

    data[mentionedAccount] = {
      index: {
        notify: JSON.stringify({
          key: mentionedAccount,
          value: {
            type: "mention",
            accountId,
            item: {
              type: "social",
              path: `${accountId}/post/main`,
            },
          },
        }),
      },
    };
  }

  return data;
}

class NearSocialStorageRequiredError extends Error {
  readonly requiredDeposit: bigint;

  constructor(requiredDeposit: bigint) {
    super("NEAR Social storage is required before relayed posts can be sent.");
    this.name = "NearSocialStorageRequiredError";
    this.requiredDeposit = requiredDeposit;
  }
}

/**
 * Hook to manage the post submission process across platforms
 */
export function useSubmitPost() {
  const apiClient = useApiClient();
  const authClient = useAuthClient();
  const near = getNearActions(authClient);
  const { data: session } = authClient.useSession();
  const isSignedIn = !!session?.user;
  const navigate = useNavigate();
  const { setSubmissionOutcome } = useSubmissionResultsStore();
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [result, setResult] = useState<SubmitResult>({ status: "idle" });

  const relayNearSocialPost = async (text: string) => {
    const connected = await near.ensureConnected();
    const accountId = near.getAccountId();
    if (!connected || !accountId) {
      throw new Error("NEAR wallet not connected. Please connect your wallet first.");
    }

    const data = buildNearSocialPostData(accountId, text);
    const storageBalance = (
      await near.view({
        contractId: SOCIAL_CONTRACT_ID,
        methodName: "storage_balance_of",
        args: { account_id: accountId },
      })
    )?.data?.result as SocialStorageBalance;
    const requiredDeposit = BigInt(
      calculateRequiredDeposit({
        data,
        storageBalance: storageBalance
          ? {
              available: BigInt(storageBalance.available),
              total: BigInt(storageBalance.total),
            }
          : null,
      }).toFixed(),
    );

    if (requiredDeposit > 0n) {
      throw new NearSocialStorageRequiredError(requiredDeposit);
    }

    const payload = await near.buildSignedDelegateAction(
      SOCIAL_CONTRACT_ID,
      (builder, receiverId) =>
        builder.functionCall(receiverId, "set", { data }, { gas: "100 Tgas", attachedDeposit: 0n }),
    );
    await near.relayTransaction({ payload });
  };

  const submitPost = async (
    posts: EditorContent[],
    selectedAccounts: ConnectedAccount[],
    postType: PostType = "post",
    targetUrl: string = "",
  ): Promise<SubmitStatus> => {
    let processingAccounts = [...selectedAccounts];

    if (!isSignedIn) {
      toast({
        title: "Error",
        description: "Wallet not connected.",
        variant: "destructive",
      });
      setStatus("failure");
      setResult({ status: "failure" });
      return "failure";
    }

    const nonEmptyPosts = posts.filter((p) => (p.text || "").trim());
    if (nonEmptyPosts.length === 0) {
      toast({
        title: "Empty Post",
        description: "Please enter your post text",
        variant: "destructive",
      });
      setStatus("idle");
      return "idle";
    }

    if (processingAccounts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one account to post to",
        variant: "destructive",
      });
      setStatus("idle");
      return "idle";
    }

    setStatus("posting");
    setResult({ status: "posting" });

    // For quote or reply, validate the URL and filter accounts by platform
    if ((postType === "quote" || postType === "reply") && targetUrl) {
      const detectedPlatform = detectPlatformFromUrl(targetUrl);

      if (!detectedPlatform) {
        toast({
          title: "Invalid URL",
          description: "Could not detect platform from the provided URL",
          variant: "destructive",
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
        toast({
          title: "No Compatible Accounts",
          description: `Please select at least one ${detectedPlatform} account to ${postType}`,
          variant: "destructive",
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
    toast({
      title: "Crossposting...",
      description: `Publishing to ${uniquePlatforms.size} platform${uniquePlatforms.size > 1 ? "s" : ""} and ${totalAccountsForThisAttempt} account${totalAccountsForThisAttempt > 1 ? "s" : ""}`,
      variant: "default",
    });

    // Results tracking
    let nearSocialSuccess = true;
    let nearSocialError: any = null;
    let apiResponse: MultiStatusData | null = null;
    let apiError: any = null;

    // --- Post to NEAR Social (only for regular posts) ---
    if (nearSocialAccounts.length > 0 && postType === "post") {
      try {
        await relayNearSocialPost(nonEmptyPosts.map((post) => post.text).join("\n\n"));
      } catch (error) {
        nearSocialSuccess = false;
        nearSocialError = error;

        if (error instanceof NearSocialStorageRequiredError) {
          toast({
            title: "NEAR Social storage required",
            description:
              "Add storage on your Manage Accounts page before sending relayed NEAR Social posts.",
            variant: "destructive",
            action: (
              <ToastAction altText="Manage Accounts" onClick={() => navigate({ to: "/manage" })}>
                Manage Accounts
              </ToastAction>
            ),
          });
        }

        console.error("NEAR Social post error:", error);
      }
    }

    // --- Post to Other Platforms ---
    if (otherAccounts.length > 0) {
      try {
        const postRequest = {
          targets: otherAccounts.map((account) => ({
            platform: account.platform,
            userId: account.userId,
          })),
          content: nonEmptyPosts,
        } satisfies CreatePostRequest;

        if (postType === "reply" && targetUrl) {
          // Extract platform and postId from URL using utility functions
          const platform = detectPlatformFromUrl(targetUrl);
          const postId = extractPostIdFromUrl(targetUrl, platform);

          if (!platform || !postId) {
            throw new Error("Invalid URL format or unsupported platform");
          }

          apiResponse = await apiClient.social.posts.reply({
            ...postRequest,
            platform,
            postId,
          } satisfies ReplyToPostRequest);
        } else if (postType === "quote" && targetUrl) {
          // For quote posts, use the dedicated quote mutation
          const platform = detectPlatformFromUrl(targetUrl);
          const postId = extractPostIdFromUrl(targetUrl, platform);

          if (!platform || !postId) {
            throw new Error("Invalid URL format or unsupported platform");
          }

          apiResponse = await apiClient.social.posts.quote({
            ...postRequest,
            platform,
            postId,
          } satisfies QuotePostRequest);
        } else {
          // Regular post
          apiResponse = await apiClient.social.posts.create(postRequest);
        }
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
    const apiResultCount = otherAccounts.length;

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

      if (otherAccounts.length > 0) {
        finalErrors = otherAccounts.map((acc) => ({
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

    // Combine NEAR Social results
    const totalSucceeded = finalSummary.succeeded + (nearSocialSuccess ? nearSocialResultCount : 0);
    const totalFailed = finalSummary.failed + (!nearSocialSuccess ? nearSocialResultCount : 0);
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
      toast({
        title: "Success!",
        description: `Your post has been published successfully to all ${combinedSummary.total} account${combinedSummary.total > 1 ? "s" : ""}.`,
        variant: "success",
      });
    } else if (finalStatus === "partial-success") {
      toast({
        title: "Partial Success",
        description: `Posted to ${combinedSummary.succeeded} of ${combinedSummary.total} accounts.`,
        variant: "default",
        action: (
          <ToastAction altText="See Results" onClick={() => navigate({ to: "/results" })}>
            See Results
          </ToastAction>
        ),
      });
    } else if (finalStatus === "failure") {
      toast({
        title: "Post Failed",
        description: `Failed to publish post to any of the ${combinedSummary.total} selected account${combinedSummary.total > 1 ? "s" : ""}.`,
        variant: "destructive",
        action: (
          <ToastAction altText="See Details" onClick={() => navigate({ to: "/results" })}>
            See Details
          </ToastAction>
        ),
      });
    } else if (
      finalStatus === "idle" &&
      totalAttempted === 0 &&
      nonEmptyPosts.length > 0 &&
      processingAccounts.length === 0 &&
      selectedAccounts.length > 0
    ) {
      // This case means all initially selected accounts were filtered out (e.g. for quote/reply)
      toast({
        title: "No Compatible Accounts",
        description: "None of your selected accounts are compatible with this action.",
        variant: "default",
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
