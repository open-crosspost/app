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
  walletApiKey: z
    .string()
    .min(1)
    .optional()
    .describe(
      "BYO path only — the user's own OutLayer wallet key (advanced). Absent: the app-managed wallet pays and the credential row lives on the app wallet.",
    ),
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

export const CampaignDestinationIdSchema = z.enum(["near-social", "twitter"]);

export const CampaignDestinationSchema = z.object({
  id: CampaignDestinationIdSchema,
  label: z.string().min(1).max(64),
  enabled: z.boolean(),
});

export const CampaignActionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(64),
  kind: z.literal("post"),
  text: z.string().min(1).max(500),
  destinations: z.array(CampaignDestinationSchema).min(1),
});

export const CampaignIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/);

export const CampaignSchema = z.object({
  id: CampaignIdSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(300).default(""),
  actions: z.array(CampaignActionSchema).min(1),
  status: z.enum(["active", "inactive"]).default("active"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const CreateCampaignSchema = z.object({
  id: CampaignIdSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(300).default(""),
  actions: z.array(CampaignActionSchema).min(1),
});

export const UpdateCampaignSchema = z
  .object({
    id: CampaignIdSchema,
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(300).optional(),
    actions: z.array(CampaignActionSchema).min(1).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine(
    (patch) =>
      Object.keys(patch).some((key) => ["name", "description", "actions", "status"].includes(key)),
    { message: "Update must change name, description, actions, or status" },
  );

export type SocialConnectAccountInput = z.infer<typeof SocialConnectAccountInputSchema>;
export type SocialConnectAccountResponse = z.infer<typeof SocialConnectAccountResponseSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaign = z.infer<typeof UpdateCampaignSchema>;
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
