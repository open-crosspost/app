import { z } from "zod";
import {
  type ActivityLeaderboardQuery,
  ActivityType,
  AccountPostsQuerySchema,
  AccountPostsResponseSchema,
  ActivityLeaderboardQuerySchema,
  ApiErrorCode,
  AuthRevokeResponseSchema,
  AuthStatusResponseSchema,
  ConnectedAccountSchema,
  ConnectedAccountsResponseSchema,
  CreatePostRequestSchema,
  DeletePostRequestSchema,
  type ErrorDetail,
  MultiStatusDataSchema,
  PlatformSchema,
  QuotePostRequestSchema,
  ReplyToPostRequestSchema,
  type ConnectedAccount,
  type CreatePostRequest,
  type DeletePostRequest,
  type Platform,
  type QuotePostRequest,
  type ReplyToPostRequest,
  type AccountPostsQuery,
  TimePeriod,
} from "../../../plugins/crosspost/src/types";

export {
  AccountPostsQuerySchema,
  AccountPostsResponseSchema,
  ActivityLeaderboardQuerySchema,
  ApiErrorCode,
  AuthRevokeResponseSchema,
  AuthStatusResponseSchema,
  ConnectedAccountSchema,
  ConnectedAccountsResponseSchema,
  CreatePostRequestSchema,
  DeletePostRequestSchema,
  MultiStatusDataSchema,
  PlatformSchema,
  QuotePostRequestSchema,
  ReplyToPostRequestSchema,
  type ConnectedAccount,
  type CreatePostRequest,
  type DeletePostRequest,
  type Platform,
  type QuotePostRequest,
  type ReplyToPostRequest,
  type AccountPostsQuery,
  type ActivityLeaderboardQuery,
  ActivityType,
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
