import { oc } from "@orpc/contract";
import { PluginErrors } from "every-plugin";
import { z } from "zod";
import {
  AccountPostsQuerySchema,
  AccountPostsResponseSchema,
  ActivityLeaderboardQuerySchema,
  AuthRevokeResponseSchema,
  AuthStatusResponseSchema,
  CampaignSchema,
  CampaignSeedRecordSchema,
  CampaignSeedSchema,
  ConnectedAccountSchema,
  ConnectedAccountsResponseSchema,
  CreateCampaignSchema,
  CreatePostRequestSchema,
  DeletePostRequestSchema,
  JobRunClaimSchema,
  JobRunListQuerySchema,
  JobRunOutputSchema,
  JobRunReportSchema,
  JobSpecCreateSchema,
  JobSpecOutputSchema,
  JobSpecStatusUpdateSchema,
  MultiStatusDataSchema,
  QuotePostRequestSchema,
  ReplyToPostRequestSchema,
  SocialAccountMutationSchema,
  SocialActivityLeaderboardResponseSchema,
  SocialConnectAccountInputSchema,
  SocialConnectAccountResponseSchema,
  SocialConnectCallbackInputSchema,
  SocialConnectCallbackResponseSchema,
  UpdateCampaignSchema,
} from "./types";

const accountsContract = oc.router({
  list: oc
    .route({ method: "GET", path: "/social/accounts" })
    .output(ConnectedAccountsResponseSchema)
    .errors(PluginErrors),

  connect: oc
    .route({ method: "POST", path: "/social/accounts/connect" })
    .input(SocialConnectAccountInputSchema)
    .output(SocialConnectAccountResponseSchema)
    .errors(PluginErrors),

  callback: oc
    .route({ method: "POST", path: "/social/accounts/callback" })
    .input(SocialConnectCallbackInputSchema)
    .output(SocialConnectCallbackResponseSchema)
    .errors(PluginErrors),

  disconnect: oc
    .route({ method: "DELETE", path: "/social/accounts" })
    .input(SocialAccountMutationSchema)
    .output(AuthRevokeResponseSchema)
    .errors(PluginErrors),

  refresh: oc
    .route({ method: "POST", path: "/social/accounts/refresh" })
    .input(SocialAccountMutationSchema)
    .output(ConnectedAccountSchema)
    .errors(PluginErrors),

  status: oc
    .route({ method: "GET", path: "/social/accounts/status/{platform}/{userId}" })
    .input(SocialAccountMutationSchema)
    .output(AuthStatusResponseSchema)
    .errors(PluginErrors),
});

const postsContract = oc.router({
  create: oc
    .route({ method: "POST", path: "/social/posts" })
    .input(CreatePostRequestSchema)
    .output(MultiStatusDataSchema)
    .errors(PluginErrors),

  reply: oc
    .route({ method: "POST", path: "/social/posts/reply" })
    .input(ReplyToPostRequestSchema)
    .output(MultiStatusDataSchema)
    .errors(PluginErrors),

  quote: oc
    .route({ method: "POST", path: "/social/posts/quote" })
    .input(QuotePostRequestSchema)
    .output(MultiStatusDataSchema)
    .errors(PluginErrors),

  delete: oc
    .route({ method: "DELETE", path: "/social/posts" })
    .input(DeletePostRequestSchema)
    .output(MultiStatusDataSchema)
    .errors(PluginErrors),
});

const activityContract = oc.router({
  leaderboard: oc
    .route({ method: "GET", path: "/social/activity/leaderboard" })
    .input(ActivityLeaderboardQuerySchema.optional())
    .output(SocialActivityLeaderboardResponseSchema)
    .errors(PluginErrors),

  accountPosts: oc
    .route({ method: "GET", path: "/social/activity/{signerId}/posts" })
    .input(
      z.object({
        signerId: z.string(),
        query: AccountPostsQuerySchema.optional(),
      }),
    )
    .output(AccountPostsResponseSchema)
    .errors(PluginErrors),
});

const campaignsContract = oc.router({
  list: oc
    .route({ method: "GET", path: "/social/campaigns" })
    .output(z.object({ campaigns: z.array(CampaignSchema) }))
    .errors(PluginErrors),

  get: oc
    .route({ method: "GET", path: "/social/campaigns/{campaignId}" })
    .input(z.object({ campaignId: z.string() }))
    .output(CampaignSchema)
    .errors(PluginErrors),

  create: oc
    .route({ method: "POST", path: "/social/campaigns" })
    .input(CreateCampaignSchema)
    .output(CampaignSchema)
    .errors(PluginErrors),

  update: oc
    .route({ method: "PATCH", path: "/social/campaigns" })
    .input(UpdateCampaignSchema)
    .output(CampaignSchema)
    .errors(PluginErrors),

  remove: oc
    .route({ method: "DELETE", path: "/social/campaigns" })
    .input(z.object({ id: z.string() }))
    .output(CampaignSchema)
    .errors(PluginErrors),

  seedRecord: oc
    .route({ method: "POST", path: "/social/campaigns/seed" })
    .input(CampaignSeedRecordSchema)
    .output(CampaignSeedSchema)
    .errors(PluginErrors),

  seedToday: oc
    .route({ method: "GET", path: "/social/campaigns/{campaignId}/seed" })
    .input(z.object({ campaignId: z.string() }))
    .output(z.object({ seed: CampaignSeedSchema.nullable() }))
    .errors(PluginErrors),
});

const jobsContract = oc.router({
  specs: {
    create: oc
      .route({ method: "POST", path: "/social/jobs/specs" })
      .input(JobSpecCreateSchema)
      .output(JobSpecOutputSchema)
      .errors(PluginErrors),

    list: oc
      .route({ method: "GET", path: "/social/jobs/specs" })
      .output(z.object({ specs: z.array(JobSpecOutputSchema) }))
      .errors(PluginErrors),

    update: oc
      .route({ method: "PATCH", path: "/social/jobs/specs" })
      .input(JobSpecStatusUpdateSchema)
      .output(JobSpecOutputSchema)
      .errors(PluginErrors),
  },

  runs: {
    list: oc
      .route({ method: "GET", path: "/social/jobs/runs" })
      .input(JobRunListQuerySchema.optional())
      .output(z.object({ runs: z.array(JobRunOutputSchema) }))
      .errors(PluginErrors),

    claim: oc
      .route({ method: "POST", path: "/social/jobs/runs/claim" })
      .input(JobRunClaimSchema)
      .output(JobRunOutputSchema)
      .errors(PluginErrors),

    report: oc
      .route({ method: "POST", path: "/social/jobs/runs/report" })
      .input(JobRunReportSchema)
      .output(JobRunOutputSchema)
      .errors(PluginErrors),
  },
});

export const socialContract = oc.router({
  accounts: accountsContract,
  posts: postsContract,
  activity: activityContract,
  campaigns: campaignsContract,
  jobs: jobsContract,
});

export type SocialContract = typeof socialContract;
