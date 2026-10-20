import { Context, Effect, Layer } from "effect";
import { createPlugin } from "every-plugin";
import { z } from "zod";
import { contract } from "./contract";
import { FarcasterService } from "./service";

export class FarcasterServiceTag extends Context.Service<FarcasterServiceTag, FarcasterService>()(
  "farcaster/FarcasterService",
) {}

/**
 * Farcaster Platform Plugin
 * Implements the platform contract for Farcaster/Neynar social media operations
 */
export default createPlugin({
  variables: z.object({
    ipfsGatewayUrl: z.string().url().default("https://gateway.pinata.cloud/ipfs"),
    timeout: z.number().default(10000),
  }),

  secrets: z.object({
    farcasterDeveloperMnemonic: z.string(),
    neynarApiKey: z.string(),
    pinataJwt: z.string(),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new FarcasterService(
        config.secrets.neynarApiKey,
        config.secrets.farcasterDeveloperMnemonic,
        config.secrets.pinataJwt,
        config.variables.ipfsGatewayUrl,
        config.variables.timeout,
      );
      return Layer.succeed(FarcasterServiceTag, service);
    }),

  createRouter: (builder) => ({
    auth: {
      getAuthUrl: builder.auth.getAuthUrl.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getAuthUrl(input)));
      }),

      exchangeCodeForToken: builder.auth.exchangeCodeForToken.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.exchangeCodeForToken(input)));
      }),

      refreshToken: builder.auth.refreshToken.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.refreshToken(input)));
      }),

      revokeToken: builder.auth.revokeToken.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.revokeToken(input)));
      }),
    },

    post: {
      create: builder.post.create.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.createPost(input)));
      }),

      delete: builder.post.delete.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.deletePost(input)));
      }),

      repost: builder.post.repost.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.repost(input)));
      }),

      quote: builder.post.quote.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.quotePost(input)));
      }),

      reply: builder.post.reply.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.replyToPost(input)));
      }),

      like: builder.post.like.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.likePost(input)));
      }),

      unlike: builder.post.unlike.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.unlikePost(input)));
      }),
    },

    media: {
      upload: builder.media.upload.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.uploadMedia(input)));
      }),

      getStatus: builder.media.getStatus.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getMediaStatus(input)));
      }),

      updateMetadata: builder.media.updateMetadata.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.updateMediaMetadata(input)));
      }),
    },

    profile: {
      get: builder.profile.get.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getProfile(input)));
      }),
    },

    rateLimit: {
      check: builder.rateLimit.check.effect(function* ({ input }) {
        const service = yield* FarcasterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.checkRateLimit(input)));
      }),
    },
  }),
});
