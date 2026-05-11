import { z } from "zod";
import {
  type AccountPostsQuery,
  AccountPostsQuerySchema,
  AccountPostsResponseSchema,
  type ActivityLeaderboardQuery,
  ActivityLeaderboardQuerySchema,
  ActivityType,
  ApiErrorCode,
  AuthRevokeResponseSchema,
  AuthStatusResponseSchema,
  type ConnectedAccount,
  ConnectedAccountSchema,
  ConnectedAccountsResponseSchema,
  type CreatePostRequest,
  CreatePostRequestSchema,
  type DeletePostRequest,
  DeletePostRequestSchema,
  type ErrorDetail,
  MultiStatusDataSchema,
  type Platform,
  PlatformSchema,
  type QuotePostRequest,
  QuotePostRequestSchema,
  type ReplyToPostRequest,
  ReplyToPostRequestSchema,
  TimePeriod,
} from "../../../plugins/crosspost/src/types";

export {
  type AccountPostsQuery,
  AccountPostsQuerySchema,
  AccountPostsResponseSchema,
  type ActivityLeaderboardQuery,
  ActivityLeaderboardQuerySchema,
  ActivityType,
  ApiErrorCode,
  AuthRevokeResponseSchema,
  AuthStatusResponseSchema,
  type ConnectedAccount,
  ConnectedAccountSchema,
  ConnectedAccountsResponseSchema,
  type CreatePostRequest,
  CreatePostRequestSchema,
  type DeletePostRequest,
  DeletePostRequestSchema,
  MultiStatusDataSchema,
  type Platform,
  PlatformSchema,
  type QuotePostRequest,
  QuotePostRequestSchema,
  type ReplyToPostRequest,
  ReplyToPostRequestSchema,
  TimePeriod,
};

export const SocialLeaderboardEntrySchema = z.object({
  signerId: z.string(),
  postCount: z.number(),
  firstPostTimestamp: z.number(),
  lastPostTimestamp: z.number(),
});

export const SocialConnectAccountInputSchema = z.object({
  platform: PlatformSchema,
});

export const SocialConnectAccountResponseSchema = z.object({
  status: z.enum(["redirect", "unavailable"]),
  url: z.string().url().optional(),
  message: z.string(),
});

export const SocialAccountMutationSchema = z.object({
  platform: PlatformSchema,
  userId: z.string(),
});

export const SocialActivityLeaderboardResponseSchema = z.object({
  entries: z.array(SocialLeaderboardEntrySchema),
  meta: z.object({
    pagination: z.object({
      total: z.number(),
    }),
  }),
});

export type SocialConnectAccountInput = z.infer<typeof SocialConnectAccountInputSchema>;
export type SocialConnectAccountResponse = z.infer<typeof SocialConnectAccountResponseSchema>;
export type SocialAccountMutation = z.infer<typeof SocialAccountMutationSchema>;
export type SocialActivityLeaderboardResponse = z.infer<
  typeof SocialActivityLeaderboardResponseSchema
>;
export type SocialMultiStatusData = z.infer<typeof MultiStatusDataSchema>;

export function makeUnsupportedPlatformResult(
  targets: Array<{ platform: string; userId: string }>,
  message: string,
): SocialMultiStatusData {
  const errors: ErrorDetail[] = targets.map((target) => ({
    code: ApiErrorCode.PLATFORM_UNAVAILABLE,
    message,
    recoverable: false,
    details: {
      platform: target.platform,
      userId: target.userId,
    },
  }));

  return {
    summary: {
      total: targets.length,
      succeeded: 0,
      failed: errors.length,
    },
    results: [],
    errors,
  };
}
