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

export const CampaignDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CampaignNearAuthorIdSchema = z
  .string()
  .regex(/^[a-z0-9_.-]{2,64}$/, "expected a NEAR account id");

export const CampaignSeedRecordSchema = z
  .object({
    campaignId: CampaignIdSchema,
    date: CampaignDateSchema.optional(),
    nearAuthorId: CampaignNearAuthorIdSchema.optional(),
    nearPostId: z.string().min(1).max(120).optional(),
    xPostId: z.string().min(1).max(64).optional(),
  })
  .refine((input) => Boolean(input.nearPostId ?? input.xPostId), {
    message: "Record at least one of nearPostId or xPostId",
  });

export const CampaignSeedSchema = z.object({
  campaignId: CampaignIdSchema,
  date: CampaignDateSchema,
  nearAuthorId: CampaignNearAuthorIdSchema.nullable(),
  nearPostId: z.string().nullable(),
  xPostId: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type CampaignSeed = z.infer<typeof CampaignSeedSchema>;
export type CampaignSeedRecord = z.infer<typeof CampaignSeedRecordSchema>;

export const CampaignParticipationModeSchema = z.enum(["manual", "auto"]);

export const CampaignParticipateSchema = z.object({
  campaignId: CampaignIdSchema,
  mode: CampaignParticipationModeSchema.default("manual"),
});

export type CampaignParticipationMode = z.infer<typeof CampaignParticipationModeSchema>;
export type CampaignParticipate = z.infer<typeof CampaignParticipateSchema>;

export const AutomationKeyStatusSchema = z.object({
  nearAccountId: z.string().nullable(),
  publicKey: z.string().nullable(),
  status: z.enum(["pending_grant", "active", "revoked"]).nullable(),
});

export const AutomationKeyPreparedSchema = z.object({
  nearAccountId: z.string(),
  publicKey: z.string(),
  status: z.enum(["pending_grant", "active"]),
});

export type AutomationKeyStatus = z.infer<typeof AutomationKeyStatusSchema>;
export type AutomationKeyPrepared = z.infer<typeof AutomationKeyPreparedSchema>;

export const AutomationKeyGrantSchema = z.object({
  txHash: z.string().max(200).optional(),
});

export const JobTargetSchema = z.object({
  platform: z.enum(["twitter", "near-social", "farcaster"]),
  accountUserId: z.string().min(1).max(100),
});

export const JobSpecScheduleSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("once"),
    at: z.iso.datetime(),
  }),
  z.object({
    mode: z.literal("daily"),
    at: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    tz: z.string().max(64).optional(),
  }),
]);

export const JobSpecPostContentSchema = z.object({
  text: z.string().max(10_000).optional(),
  media: z
    .array(
      z.object({
        data: z.string().max(5_000_000),
        mimeType: z.string().optional(),
        altText: z.string().optional(),
      }),
    )
    .optional(),
});

export const JobSpecCreateSchema = z
  .object({
    kind: z.enum(["scheduled", "campaign"]),
    campaignId: CampaignIdSchema.optional(),
    posts: z.array(JobSpecPostContentSchema).min(1).optional(),
    targets: z.array(JobTargetSchema).min(1),
    schedule: JobSpecScheduleSchema,
  })
  .refine(
    (input) => (input.kind === "scheduled" ? Boolean(input.posts) : Boolean(input.campaignId)),
    {
      message: "kind 'scheduled' requires posts; kind 'campaign' requires campaignId",
    },
  );

export const JobSpecOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  kind: z.enum(["scheduled", "campaign"]),
  campaignId: z.string().nullable(),
  actionId: z.string().nullable(),
  posts: z.array(JobSpecPostContentSchema).nullable(),
  targets: z.array(JobTargetSchema),
  schedule: JobSpecScheduleSchema,
  status: z.enum(["active", "paused", "cancelled"]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const JobSpecStatusUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(["active", "paused", "cancelled"]),
});

export const JobRunStatusSchema = z.enum([
  "pending",
  "executing",
  "completed",
  "failed",
  "needs_signature",
  "cancelled",
]);

export const JobRunOutputSchema = z.object({
  id: z.string(),
  specId: z.string(),
  userId: z.string(),
  kind: z.enum(["scheduled", "campaign"]),
  campaignId: z.string().nullable(),
  posts: z.array(JobSpecPostContentSchema).nullable(),
  targets: z.array(JobTargetSchema),
  scheduledFor: z.iso.datetime(),
  status: JobRunStatusSchema,
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  executedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const JobRunListQuerySchema = z.object({
  specId: z.string().optional(),
  status: JobRunStatusSchema.optional(),
  due: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const JobRunClaimSchema = z.object({
  runId: z.string(),
  expectedStatus: z.enum(["pending", "needs_signature"]).default("pending"),
});

export const JobRunReportSchema = z.object({
  runId: z.string(),
  status: z.enum(["completed", "failed", "needs_signature"]),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().max(1000).optional(),
});

export type SocialConnectAccountInput = z.infer<typeof SocialConnectAccountInputSchema>;
export type SocialConnectAccountResponse = z.infer<typeof SocialConnectAccountResponseSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type CreateCampaign = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaign = z.infer<typeof UpdateCampaignSchema>;
export type JobTarget = z.infer<typeof JobTargetSchema>;
export type JobSpecSchedule = z.infer<typeof JobSpecScheduleSchema>;
export type JobSpecCreate = z.infer<typeof JobSpecCreateSchema>;
export type JobSpec = z.infer<typeof JobSpecOutputSchema>;
export type JobRun = z.infer<typeof JobRunOutputSchema>;
export type JobRunListQuery = z.infer<typeof JobRunListQuerySchema>;
export type JobRunClaim = z.infer<typeof JobRunClaimSchema>;
export type JobRunReport = z.infer<typeof JobRunReportSchema>;
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
