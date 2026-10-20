import { type AnyContractRouter, oc } from "@orpc/contract";
import { PluginErrors } from "every-plugin";
import { z } from "zod";
import * as Types from "./types";

const authRouter = oc.router({
  authorizeNearAccount: oc
    .route({ method: "POST", path: "/auth/authorize/near" })
    .input(Types.NearAuthorizationRequestSchema)
    .output(Types.NearAuthorizationResponseSchema)
    .errors(PluginErrors),

  getNearAuthorizationStatus: oc
    .route({ method: "GET", path: "/auth/authorize/near/status" })
    .output(Types.NearAuthorizationStatusResponseSchema)
    .errors(PluginErrors),

  loginToPlatform: oc
    .route({ method: "POST", path: "/auth/{platform}/login" })
    .input(
      z.object({
        platform: Types.PlatformSchema,
        options: Types.AuthInitRequestSchema.optional(),
      }),
    )
    .output(Types.AuthUrlResponseSchema)
    .errors(PluginErrors),

  refreshToken: oc
    .route({ method: "POST", path: "/auth/{platform}/refresh" })
    .input(
      z.object({
        platform: Types.PlatformSchema,
        userId: z.string(),
      }),
    )
    .output(Types.AuthCallbackResponseSchema)
    .errors(PluginErrors),

  refreshProfile: oc
    .route({ method: "POST", path: "/auth/{platform}/refresh-profile" })
    .input(
      z.object({
        platform: Types.PlatformSchema,
        userId: z.string(),
      }),
    )
    .output(Types.ConnectedAccountSchema)
    .errors(PluginErrors),

  getAuthStatus: oc
    .route({ method: "GET", path: "/auth/{platform}/status/{userId}" })
    .input(
      z.object({
        platform: Types.PlatformSchema,
        userId: z.string(),
      }),
    )
    .output(Types.AuthStatusResponseSchema)
    .errors(PluginErrors),

  unauthorizeNear: oc
    .route({ method: "DELETE", path: "/auth/unauthorize/near" })
    .input(Types.NearAuthorizationRequestSchema)
    .output(Types.NearUnauthorizationResponseSchema)
    .errors(PluginErrors),

  revokeAuth: oc
    .route({ method: "DELETE", path: "/auth/{platform}/revoke" })
    .input(
      z.object({
        platform: Types.PlatformSchema,
        userId: z.string(),
      }),
    )
    .output(Types.AuthRevokeResponseSchema)
    .errors(PluginErrors),

  getConnectedAccounts: oc
    .route({ method: "GET", path: "/auth/accounts" })
    .output(Types.ConnectedAccountsResponseSchema)
    .errors(PluginErrors),
}) satisfies AnyContractRouter;

const postRouter = oc.router({
  create: oc
    .route({ method: "POST", path: "/api/post" })
    .input(Types.CreatePostRequestSchema)
    .output(z.object({ data: Types.MultiStatusDataSchema }))
    .errors(PluginErrors),

  delete: oc
    .route({ method: "DELETE", path: "/api/post" })
    .input(Types.DeletePostRequestSchema)
    .output(z.object({ data: Types.MultiStatusDataSchema }))
    .errors(PluginErrors),

  repost: oc
    .route({ method: "POST", path: "/api/post/repost" })
    .input(Types.RepostRequestSchema)
    .output(z.object({ data: Types.MultiStatusDataSchema }))
    .errors(PluginErrors),

  quote: oc
    .route({ method: "POST", path: "/api/post/quote" })
    .input(Types.QuotePostRequestSchema)
    .output(z.object({ data: Types.MultiStatusDataSchema }))
    .errors(PluginErrors),

  reply: oc
    .route({ method: "POST", path: "/api/post/reply" })
    .input(Types.ReplyToPostRequestSchema)
    .output(z.object({ data: Types.MultiStatusDataSchema }))
    .errors(PluginErrors),

  like: oc
    .route({ method: "POST", path: "/api/post/like" })
    .input(Types.LikePostRequestSchema)
    .output(z.object({ data: Types.MultiStatusDataSchema }))
    .errors(PluginErrors),

  unlike: oc
    .route({ method: "DELETE", path: "/api/post/like" })
    .input(Types.UnlikePostRequestSchema)
    .output(z.object({ data: Types.MultiStatusDataSchema }))
    .errors(PluginErrors),
}) satisfies AnyContractRouter;

const activityRouter = oc.router({
  getLeaderboard: oc
    .route({ method: "GET", path: "/api/activity" })
    .input(Types.ActivityLeaderboardQuerySchema.optional())
    .output(Types.ActivityLeaderboardResponseSchema)
    .errors(PluginErrors),

  getAccountActivity: oc
    .route({ method: "GET", path: "/api/activity/{signerId}" })
    .input(
      z.object({
        signerId: z.string(),
        query: Types.AccountActivityQuerySchema.optional(),
      }),
    )
    .output(Types.AccountActivityResponseSchema)
    .errors(PluginErrors),

  getAccountPosts: oc
    .route({ method: "GET", path: "/api/activity/{signerId}/posts" })
    .input(
      z.object({
        signerId: z.string(),
        query: Types.AccountPostsQuerySchema.optional(),
      }),
    )
    .output(Types.AccountPostsResponseSchema)
    .errors(PluginErrors),
}) satisfies AnyContractRouter;

const systemRouter = oc.router({
  getRateLimits: oc
    .route({ method: "GET", path: "/api/rate-limit" })
    .output(Types.RateLimitResponseSchema)
    .errors(PluginErrors),

  getEndpointRateLimit: oc
    .route({ method: "GET", path: "/api/rate-limit/{endpoint}" })
    .input(
      z.object({
        endpoint: z.string(),
      }),
    )
    .output(Types.EndpointRateLimitResponseSchema)
    .errors(PluginErrors),

  getHealthStatus: oc
    .route({ method: "GET", path: "/health" })
    .output(Types.HealthStatusSchema)
    .errors(PluginErrors),
}) satisfies AnyContractRouter;

export const contract = oc.router({
  auth: authRouter,
  post: postRouter,
  activity: activityRouter,
  system: systemRouter,
}) satisfies AnyContractRouter;

export type ContractType = typeof contract;
