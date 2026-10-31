import { Context, Effect, Layer } from "effect";
import { createPlugin } from "every-plugin";
import { z } from "zod";
import { contract } from "./contract";
import { TwitterService } from "./service";

export class TwitterServiceTag extends Context.Service<TwitterServiceTag, TwitterService>()(
  "twitter/TwitterService",
) {}

/**
 * Twitter Platform Plugin — the OAuth connect handoff only. The direct
 * posting surface retired with ticket #21 is no longer mounted.
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
      const service = new TwitterService(
        config.secrets.X_CLIENT_ID,
        config.secrets.X_CLIENT_SECRET,
      );
      return yield* Effect.succeed(Layer.succeed(TwitterServiceTag, service));
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
    },
  }),
});
