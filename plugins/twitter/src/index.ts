import { Context, Effect, Layer } from "effect";
import { createPlugin } from "every-plugin";
import { z } from "zod";
import { contract } from "./contract";
import { TwitterService } from "./service";

export class TwitterServiceTag extends Context.Service<TwitterServiceTag, TwitterService>()(
  "twitter/TwitterService",
) {}

/**
 * Twitter Platform Plugin — the OAuth connect handoff's consent URL only.
 * The app's X app is a public client for this surface: the code exchange
 * runs inside the connector's enclave (exchange_code), so no client secret
 * is configured here.
 */
export default createPlugin({
  variables: z.object({}),

  secrets: z.object({
    X_CLIENT_ID: z.string().describe("X OAuth 2.0 Client ID (public client)"),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new TwitterService(config.secrets.X_CLIENT_ID);
      return yield* Effect.succeed(Layer.succeed(TwitterServiceTag, service));
    }),

  createRouter: (builder) => ({
    auth: {
      getAuthUrl: builder.auth.getAuthUrl.effect(function* ({ input }) {
        const service = yield* TwitterServiceTag;
        return yield* Effect.promise(() => Effect.runPromise(service.getAuthUrl(input)));
      }),
    },
  }),
});
