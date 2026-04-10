import { oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import * as AuthSchemas from "./types/platform-schemas/auth";
import * as MediaSchemas from "./types/platform-schemas/media";
import * as PostSchemas from "./types/platform-schemas/post";
import * as ProfileSchemas from "./types/platform-schemas/profile";
import * as RateLimitSchemas from "./types/platform-schemas/rate-limit";

export const platformContract = oc.router({
  auth: {
    getAuthUrl: oc
      .route({ method: "GET", path: "/auth/url" })
      .input(AuthSchemas.GetAuthUrlInputSchema)
      .output(z.string()),
    exchangeCodeForToken: oc
      .route({ method: "POST", path: "/auth/token" })
      .input(AuthSchemas.ExchangeCodeInputSchema)
      .output(AuthSchemas.AuthTokenSchema),
    refreshToken: oc
      .route({ method: "POST", path: "/auth/refresh" })
      .input(AuthSchemas.RefreshTokenInputSchema)
      .output(AuthSchemas.AuthTokenSchema),
    revokeToken: oc
      .route({ method: "DELETE", path: "/auth/token" })
      .input(AuthSchemas.RevokeTokenInputSchema)
      .output(z.boolean()),
  },

  post: {
    create: oc
      .route({ method: "POST", path: "/post" })
      .input(PostSchemas.CreatePostInputSchema)
      .output(PostSchemas.PostResultSchema),
    delete: oc
      .route({ method: "DELETE", path: "/post/{postId}" })
      .input(PostSchemas.DeletePostInputSchema)
      .output(PostSchemas.DeleteResultSchema),
    repost: oc
      .route({ method: "POST", path: "/post/{postId}/repost" })
      .input(PostSchemas.RepostInputSchema)
      .output(PostSchemas.PostResultSchema),
    quote: oc
      .route({ method: "POST", path: "/post/{postId}/quote" })
      .input(PostSchemas.QuotePostInputSchema)
      .output(PostSchemas.PostResultSchema),
    reply: oc
      .route({ method: "POST", path: "/post/{postId}/reply" })
      .input(PostSchemas.ReplyInputSchema)
      .output(PostSchemas.PostResultSchema),
    like: oc
      .route({ method: "POST", path: "/post/{postId}/like" })
      .input(PostSchemas.LikeInputSchema)
      .output(PostSchemas.LikeResultSchema),
    unlike: oc
      .route({ method: "DELETE", path: "/post/{postId}/like" })
      .input(PostSchemas.UnlikeInputSchema)
      .output(PostSchemas.LikeResultSchema),
  },

  media: {
    upload: oc
      .route({ method: "POST", path: "/media" })
      .input(MediaSchemas.UploadMediaInputSchema)
      .output(MediaSchemas.MediaUploadResultSchema),
    getStatus: oc
      .route({ method: "GET", path: "/media/{mediaId}/status" })
      .input(MediaSchemas.GetMediaStatusInputSchema)
      .output(MediaSchemas.MediaStatusResultSchema),
    updateMetadata: oc
      .route({ method: "PUT", path: "/media/{mediaId}/metadata" })
      .input(MediaSchemas.UpdateMediaMetadataInputSchema)
      .output(z.boolean()),
  },

  profile: {
    get: oc
      .route({ method: "GET", path: "/profile" })
      .input(ProfileSchemas.GetProfileInputSchema)
      .output(ProfileSchemas.UserProfileSchema),
  },

  rateLimit: {
    check: oc
      .route({ method: "GET", path: "/rate-limit" })
      .input(RateLimitSchemas.CheckRateLimitInputSchema)
      .output(RateLimitSchemas.RateLimitStatusSchema),
  },
});

export type PlatformContract = typeof platformContract;

export * from "./types/platform-schemas/auth";
export * from "./types/platform-schemas/media";
export * from "./types/platform-schemas/post";
export * from "./types/platform-schemas/profile";
export * from "./types/platform-schemas/rate-limit";
