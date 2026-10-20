import { Context, Effect, Layer } from "effect";
import { createPlugin } from "every-plugin";
import { z } from "zod";
import { contract } from "./contract";
import { TwitterService } from "./service";

export class TwitterServiceTag extends Context.Service<TwitterServiceTag, TwitterService>()(
  "twitter/TwitterService",
) {}

/**
 * Twitter Platform Plugin
 * Implements the platform contract for Twitter/X social media operations
 */
export default createPlugin({
  variables: z.object(),

  secrets: z.object({
    X_CLIENT_ID: z.string().describe("X OAuth 2.0 Client ID"),
    X_CLIENT_SECRET: z.string().describe("X OAuth 2.0 Client Secret"),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new TwitterService(config.secrets.X_CLIENT_ID, config.secrets.X_CLIENT_SECRET);
      return Layer.succeed(TwitterServiceTag, service);
    }),

  createRouter: (builder) => ({
    auth: {
      getAuthUrl: builder.auth.getAuthUrl.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getAuthUrl(input)));
      }),

      exchangeCodeForToken: builder.auth.exchangeCodeForToken.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.exchangeCodeForToken(input)));
      }),

      refreshToken: builder.auth.refreshToken.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.refreshToken(input)));
      }),

      revokeToken: builder.auth.revokeToken.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.revokeToken(input)));
      }),
    },

    post: {
      create: builder.post.create.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.createPost(input)));
      }),

      delete: builder.post.delete.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.deletePost(input)));
      }),

      repost: builder.post.repost.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.repost(input)));
      }),

      quote: builder.post.quote.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.quotePost(input)));
      }),

      reply: builder.post.reply.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.replyToPost(input)));
      }),

      like: builder.post.like.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.likePost(input)));
      }),

      unlike: builder.post.unlike.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.unlikePost(input)));
      }),
    },

    media: {
      upload: builder.media.upload.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.uploadMedia(input)));
      }),

      getStatus: builder.media.getStatus.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getMediaStatus(input)));
      }),

      updateMetadata: builder.media.updateMetadata.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.updateMediaMetadata(input)));
      }),
    },

    profile: {
      get: builder.profile.get.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getProfile(input)));
      }),
    },

    rateLimit: {
      check: builder.rateLimit.check.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.checkRateLimit(input)));
      }),
    },
  }),
});
