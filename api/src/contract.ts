import { oc } from "@orpc/contract";
import { CommonPluginErrors } from "every-plugin";
import { z } from "zod";
import * as Types from "./types";

export const contract = oc.router({
  auth: oc.router({
    authorizeNearAccount: oc
      .route({ method: "POST", path: "/auth/authorize/near" })
      .input(Types.NearAuthorizationRequestSchema)
      .output(Types.NearAuthorizationResponseSchema)
      .errors(CommonPluginErrors),

    getNearAuthorizationStatus: oc
      .route({ method: "GET", path: "/auth/authorize/near/status" })
      .output(Types.NearAuthorizationStatusResponseSchema)
      .errors(CommonPluginErrors),

    loginToPlatform: oc
      .route({ method: "POST", path: "/auth/{platform}/login" })
      .input(
        z.object({
          platform: Types.PlatformSchema,
          options: Types.AuthInitRequestSchema.optional(),
        }),
      )
      .output(Types.AuthUrlResponseSchema)
      .errors(CommonPluginErrors),

    refreshToken: oc
      .route({ method: "POST", path: "/auth/{platform}/refresh" })
      .input(
        z.object({
          platform: Types.PlatformSchema,
          userId: z.string(),
        }),
      )
      .output(Types.AuthCallbackResponseSchema)
      .errors(CommonPluginErrors),

    refreshProfile: oc
      .route({ method: "POST", path: "/auth/{platform}/refresh-profile" })
      .input(
        z.object({
          platform: Types.PlatformSchema,
          userId: z.string(),
        }),
      )
      .output(Types.ConnectedAccountSchema)
      .errors(CommonPluginErrors),

    getAuthStatus: oc
      .route({ method: "GET", path: "/auth/{platform}/status/{userId}" })
      .input(
        z.object({
          platform: Types.PlatformSchema,
          userId: z.string(),
        }),
      )
      .output(Types.AuthStatusResponseSchema)
      .errors(CommonPluginErrors),

    unauthorizeNear: oc
      .route({ method: "DELETE", path: "/auth/unauthorize/near" })
      .input(Types.NearAuthorizationRequestSchema)
      .output(Types.NearUnauthorizationResponseSchema)
      .errors(CommonPluginErrors),

    revokeAuth: oc
      .route({ method: "DELETE", path: "/auth/{platform}/revoke" })
      .input(
        z.object({
          platform: Types.PlatformSchema,
          userId: z.string(),
        }),
      )
      .output(Types.AuthRevokeResponseSchema)
      .errors(CommonPluginErrors),

    getConnectedAccounts: oc
      .route({ method: "GET", path: "/auth/accounts" })
      .output(Types.ConnectedAccountsResponseSchema)
      .errors(CommonPluginErrors),
  }),

  post: oc.router({
    create: oc
      .route({ method: "POST", path: "/api/post" })
      .input(Types.CreatePostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),

    delete: oc
      .route({ method: "DELETE", path: "/api/post" })
      .input(Types.DeletePostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),

    repost: oc
      .route({ method: "POST", path: "/api/post/repost" })
      .input(Types.RepostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),

    quote: oc
      .route({ method: "POST", path: "/api/post/quote" })
      .input(Types.QuotePostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),

    reply: oc
      .route({ method: "POST", path: "/api/post/reply" })
      .input(Types.ReplyToPostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),

    like: oc
      .route({ method: "POST", path: "/api/post/like" })
      .input(Types.LikePostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),

    unlike: oc
      .route({ method: "DELETE", path: "/api/post/like" })
      .input(Types.UnlikePostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),
  }),

  activity: oc.router({
    getLeaderboard: oc
      .route({ method: "GET", path: "/api/activity" })
      .input(Types.ActivityLeaderboardQuerySchema.optional())
      .output(Types.ActivityLeaderboardResponseSchema)
      .errors(CommonPluginErrors),

    getAccountActivity: oc
      .route({ method: "GET", path: "/api/activity/{signerId}" })
      .input(
        z.object({
          signerId: z.string(),
          query: Types.AccountActivityQuerySchema.optional(),
        }),
      )
      .output(Types.AccountActivityResponseSchema)
      .errors(CommonPluginErrors),

    getAccountPosts: oc
      .route({ method: "GET", path: "/api/activity/{signerId}/posts" })
      .input(
        z.object({
          signerId: z.string(),
          query: Types.AccountPostsQuerySchema.optional(),
        }),
      )
      .output(Types.AccountPostsResponseSchema)
      .errors(CommonPluginErrors),
  }),

  system: oc.router({
    getRateLimits: oc
      .route({ method: "GET", path: "/api/rate-limit" })
      .output(Types.RateLimitResponseSchema)
      .errors(CommonPluginErrors),

    getEndpointRateLimit: oc
      .route({ method: "GET", path: "/api/rate-limit/{endpoint}" })
      .input(
        z.object({
          endpoint: z.string(),
        }),
      )
      .output(Types.EndpointRateLimitResponseSchema)
      .errors(CommonPluginErrors),

    getHealthStatus: oc
      .route({ method: "GET", path: "/health" })
      .output(Types.HealthStatusSchema)
      .errors(CommonPluginErrors),
  }),

  relay: oc.router({
    connect: oc
      .route({
        method: "POST",
        path: "/relay/connect",
        summary: "Ensure storage deposit for gasless NEAR Social",
      })
      .input(
        z.object({
          accountId: z.string().min(1),
        }),
      )
      .output(
        z.object({
          accountId: z.string(),
          hasStorage: z.boolean(),
          depositTxHash: z.string().optional(),
        }),
      )
      .errors(CommonPluginErrors),

    publish: oc
      .route({
        method: "POST",
        path: "/relay/publish",
        summary: "Submit a signed delegate action for gasless relay",
      })
      .input(
        z.object({
          signedDelegateAction: z.string().min(1),
        }),
      )
      .output(
        z.object({
          hash: z.string(),
        }),
      )
      .errors(CommonPluginErrors),

    status: oc
      .route({
        method: "GET",
        path: "/relay/status/{txHash}",
        summary: "Check relayed transaction status",
      })
      .input(
        z.object({
          txHash: z.string(),
        }),
      )
      .output(
        z.object({
          txHash: z.string(),
          status: z.enum(["pending", "completed", "failed"]),
          gasUsed: z.string().optional(),
        }),
      )
      .errors(CommonPluginErrors),
  }),

  ping: oc
    .route({ method: "GET", path: "/ping" })
    .output(
      z.object({
        status: z.string(),
        timestamp: z.iso.datetime(),
      }),
    ),

  reloadConfig: oc
    .route({ method: "POST", path: "/v1/reload-config" })
    .output(
      z.object({
        status: z.enum(["pending"]),
        note: z.string(),
      }),
    ),
});

export type ContractType = typeof contract;
