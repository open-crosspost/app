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
  redirectUri: z.string().url(),
});

export const SocialConnectAccountResponseSchema = z.object({
  status: z.enum(["redirect", "unavailable"]),
  url: z.string().url().optional(),
  state: z.string().optional(),
  message: z.string().optional(),
});

export const SocialConnectCallbackInputSchema = z.object({
  platform: PlatformSchema,
  code: z.string().min(1),
  state: z.string().min(1),
  walletApiKey: z.string().min(1),
});

export const SocialConnectCallbackResponseSchema = z.object({
  status: z.literal("connected"),
  scope: z.array(z.string()),
  xUserId: z.string(),
  username: z.string().optional(),
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
export type SocialConnectCallbackInput = z.infer<typeof SocialConnectCallbackInputSchema>;
export type SocialConnectCallbackResponse = z.infer<typeof SocialConnectCallbackResponseSchema>;
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
