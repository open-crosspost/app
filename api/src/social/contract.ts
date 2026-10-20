import { oc } from "@orpc/contract";
import { PluginErrors } from "every-plugin";
import { z } from "zod";
import {
  AccountPostsQuerySchema,
  AccountPostsResponseSchema,
  ActivityLeaderboardQuerySchema,
  AuthRevokeResponseSchema,
  AuthStatusResponseSchema,
  ConnectedAccountSchema,
  ConnectedAccountsResponseSchema,
  CreatePostRequestSchema,
  DeletePostRequestSchema,
  MultiStatusDataSchema,
  QuotePostRequestSchema,
  ReplyToPostRequestSchema,
  SocialAccountMutationSchema,
  SocialActivityLeaderboardResponseSchema,
  SocialConnectAccountInputSchema,
  SocialConnectAccountResponseSchema,
  SocialConnectCallbackInputSchema,
  SocialConnectCallbackResponseSchema,
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

export const socialContract = oc.router({
  accounts: accountsContract,
  posts: postsContract,
  activity: activityContract,
});

export type SocialContract = typeof socialContract;
