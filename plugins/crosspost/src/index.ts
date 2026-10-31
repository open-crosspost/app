import { Context, Effect, Layer } from "effect";
import { createPlugin } from "every-plugin";
import { z } from "zod";
import { contract } from "./contract";
import { CrosspostService } from "./service";
import { NearAuthDataSchema } from "./types/auth";

export class CrosspostServiceTag extends Context.Service<CrosspostServiceTag, CrosspostService>()(
  "crosspost/CrosspostService",
) {}

/**
 * Crosspost Plugin - Social media cross-posting with NEAR authentication
 *
 * Provides secure social media operations using NEAR wallet authentication
 * instead of traditional OAuth tokens.
 */
export default createPlugin({
  variables: z.object({
    baseUrl: z.string().url().default("https://social.invalid"),
    timeout: z.number().min(1000).max(60000).default(10000),
  }),

  secrets: z.object({
    // Store as JSON string, parse into NearAuthData
    nearAuthData: z
      .string()
      .transform((str) => JSON.parse(str))
      .pipe(NearAuthDataSchema),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new CrosspostService(
        config.variables.baseUrl,
        config.secrets.nearAuthData,
        config.variables.timeout,
      );

      yield* service.getHealthStatus().pipe(
        Effect.catchCause((cause) => {
          console.warn("[Crosspost] Health check failed, continuing anyway:", cause);
          return Effect.void;
        }),
      );

      return Layer.succeed(CrosspostServiceTag, service);
    }),

  createRouter: (builder) => ({
    auth: {
      authorizeNearAccount: builder.auth.authorizeNearAccount.effect(function* () {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.authorizeNearAccount()));
      }),

      getNearAuthorizationStatus: builder.auth.getNearAuthorizationStatus.effect(function* () {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getNearAuthorizationStatus()));
      }),

      loginToPlatform: builder.auth.loginToPlatform.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() =>
          Effect.runPromise(service.loginToPlatform(input.platform, input.options)),
        );
      }),

      refreshToken: builder.auth.refreshToken.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() =>
          Effect.runPromise(service.refreshToken(input.platform, input.userId)),
        );
      }),

      refreshProfile: builder.auth.refreshProfile.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() =>
          Effect.runPromise(service.refreshProfile(input.platform, input.userId)),
        );
      }),

      getAuthStatus: builder.auth.getAuthStatus.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() =>
          Effect.runPromise(service.getAuthStatus(input.platform, input.userId)),
        );
      }),

      unauthorizeNear: builder.auth.unauthorizeNear.effect(function* () {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.unauthorizeNear()));
      }),

      revokeAuth: builder.auth.revokeAuth.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() =>
          Effect.runPromise(service.revokeAuth(input.platform, input.userId)),
        );
      }),

      getConnectedAccounts: builder.auth.getConnectedAccounts.effect(function* () {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getConnectedAccounts()));
      }),
    },

    post: {
      create: builder.post.create.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        const data = yield* Effect.promise(() => Effect.runPromise(service.createPost(input)));
        return { data };
      }),

      delete: builder.post.delete.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        const data = yield* Effect.promise(() => Effect.runPromise(service.deletePost(input)));
        return { data };
      }),

      repost: builder.post.repost.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        const data = yield* Effect.promise(() => Effect.runPromise(service.repost(input)));
        return { data };
      }),

      quote: builder.post.quote.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        const data = yield* Effect.promise(() => Effect.runPromise(service.quotePost(input)));
        return { data };
      }),

      reply: builder.post.reply.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        const data = yield* Effect.promise(() => Effect.runPromise(service.replyToPost(input)));
        return { data };
      }),

      like: builder.post.like.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        const data = yield* Effect.promise(() => Effect.runPromise(service.likePost(input)));
        return { data };
      }),

      unlike: builder.post.unlike.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        const data = yield* Effect.promise(() => Effect.runPromise(service.unlikePost(input)));
        return { data };
      }),
    },

    activity: {
      getLeaderboard: builder.activity.getLeaderboard.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getLeaderboard(input)));
      }),

      getAccountActivity: builder.activity.getAccountActivity.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() =>
          Effect.runPromise(service.getAccountActivity(input.signerId, input.query)),
        );
      }),

      getAccountPosts: builder.activity.getAccountPosts.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() =>
          Effect.runPromise(service.getAccountPosts(input.signerId, input.query)),
        );
      }),
    },

    system: {
      getRateLimits: builder.system.getRateLimits.effect(function* () {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getRateLimits()));
      }),

      getEndpointRateLimit: builder.system.getEndpointRateLimit.effect(function* ({ input }) {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() =>
          Effect.runPromise(service.getEndpointRateLimit(input.endpoint)),
        );
      }),

      getHealthStatus: builder.system.getHealthStatus.effect(function* () {
        const service = yield* CrosspostServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getHealthStatus()));
      }),
    },
  }),
});
