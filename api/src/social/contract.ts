import { oc } from "@orpc/contract";
import { CommonPluginErrors } from "every-plugin";
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
} from "./types";

const accountsContract = oc.router({
  list: oc
    .route({ method: "GET", path: "/social/accounts" })
    .output(ConnectedAccountsResponseSchema)
    .errors(CommonPluginErrors),

  connect: oc
    .route({ method: "POST", path: "/social/accounts/connect" })
    .input(SocialConnectAccountInputSchema)
    .output(SocialConnectAccountResponseSchema)
    .errors(CommonPluginErrors),

  disconnect: oc
    .route({ method: "DELETE", path: "/social/accounts" })
    .input(SocialAccountMutationSchema)
    .output(AuthRevokeResponseSchema)
    .errors(CommonPluginErrors),

  refresh: oc
    .route({ method: "POST", path: "/social/accounts/refresh" })
    .input(SocialAccountMutationSchema)
    .output(ConnectedAccountSchema)
    .errors(CommonPluginErrors),

  status: oc
    .route({ method: "GET", path: "/social/accounts/status/{platform}/{userId}" })
    .input(SocialAccountMutationSchema)
    .output(AuthStatusResponseSchema)
    .errors(CommonPluginErrors),
});

const postsContract = oc.router({
  create: oc
    .route({ method: "POST", path: "/social/posts" })
    .input(CreatePostRequestSchema)
    .output(MultiStatusDataSchema)
    .errors(CommonPluginErrors),

  reply: oc
    .route({ method: "POST", path: "/social/posts/reply" })
    .input(ReplyToPostRequestSchema)
    .output(MultiStatusDataSchema)
    .errors(CommonPluginErrors),

  quote: oc
    .route({ method: "POST", path: "/social/posts/quote" })
    .input(QuotePostRequestSchema)
    .output(MultiStatusDataSchema)
    .errors(CommonPluginErrors),

  delete: oc
    .route({ method: "DELETE", path: "/social/posts" })
    .input(DeletePostRequestSchema)
    .output(MultiStatusDataSchema)
    .errors(CommonPluginErrors),
});

const activityContract = oc.router({
  leaderboard: oc
    .route({ method: "GET", path: "/social/activity/leaderboard" })
    .input(ActivityLeaderboardQuerySchema.optional())
    .output(SocialActivityLeaderboardResponseSchema)
    .errors(CommonPluginErrors),

  accountPosts: oc
    .route({ method: "GET", path: "/social/activity/{signerId}/posts" })
    .input(
      z.object({
        signerId: z.string(),
        query: AccountPostsQuerySchema.optional(),
      }),
    )
    .output(AccountPostsResponseSchema)
    .errors(CommonPluginErrors),
});

export const socialContract = oc.router({
  accounts: accountsContract,
  posts: postsContract,
  activity: activityContract,
});

export type SocialContract = typeof socialContract;
