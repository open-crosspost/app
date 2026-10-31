import { Context, Effect, Layer } from "effect";
import { createPlugin } from "every-plugin";
import { z } from "zod";
import { contract } from "./contract";
import { createDatabaseDriver } from "./db";
import { requireAuthContext } from "./lib/auth";
import type { PluginsClient } from "./lib/plugins-types.gen";
import { SocialRepository } from "./social/repository";
import { SocialService } from "./social/service";

export class SocialServiceTag extends Context.Service<SocialServiceTag, SocialService>()(
  "api/SocialService",
) {}

export interface AuthContext {
  userId: string;
  user: {
    id: string;
    role?: string;
    email?: string;
    name?: string;
  };
  near?: {
    primaryAccountId?: string | null;
    linkedAccounts?: { accountId: string; network: string; publicKey: string }[];
    hasNearAccount?: boolean;
  };
  organizationId?: string;
  organizationRole?: string;
  reqHeaders?: Headers;
  auth: unknown;
}

// Set in initialize, read in createRouter (which runs after the plugin's
// services are built) to wire the sibling twitter client factory.
let socialService: SocialService | null = null;

export default createPlugin.withPlugins<PluginsClient>()({
  variables: z.object({}),

  secrets: z.object({
    API_DATABASE_URL: z.string().default("file:./api.db"),
    API_DATABASE_AUTH_TOKEN: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().optional(),
    X_CLIENT_ID: z.string().optional(),
    X_CLIENT_SECRET: z.string().optional(),
    X_CONNECT_PROJECT: z.string().optional(),
    X_POLICY_MAX_PER_DAY: z.string().optional(),
    OUTLAYER_APP_WALLET_KEY: z.string().optional(),
  }),

  context: z.object({
    userId: z.string().optional(),
    user: z
      .object({
        id: z.string(),
        role: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
      })
      .optional(),
    near: z
      .object({
        primaryAccountId: z.string().nullable(),
        linkedAccounts: z.array(
          z.object({
            accountId: z.string(),
            network: z.string(),
            publicKey: z.string(),
            isPrimary: z.boolean().optional(),
          }),
        ),
        hasNearAccount: z.boolean(),
      })
      .optional(),
    organizationId: z.string().optional(),
    organizationRole: z.string().optional(),
    reqHeaders: z.custom<Headers>().optional(),
    getRawBody: z.custom<() => Promise<string>>().optional(),
    auth: z.unknown().optional(),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const driver = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => createDatabaseDriver(config.secrets.API_DATABASE_URL),
          catch: (cause) => new Error(`api database driver failed: ${String(cause)}`),
        }),
        (driver) => Effect.promise(() => driver.close()).pipe(Effect.ignore),
      );

      const socialRepository = new SocialRepository(driver.db);
      const maxPerDayRaw = config.secrets.X_POLICY_MAX_PER_DAY;
      const maxPerDay = maxPerDayRaw ? Number.parseInt(maxPerDayRaw, 10) : undefined;
      const social = new SocialService(socialRepository, {
        clientId: config.secrets.X_CLIENT_ID,
        clientSecret: config.secrets.X_CLIENT_SECRET,
        project: config.secrets.X_CONNECT_PROJECT,
        appWalletKey: config.secrets.OUTLAYER_APP_WALLET_KEY,
        maxPerDay: Number.isFinite(maxPerDay) ? maxPerDay : undefined,
      });

      yield* Effect.promise(() => social.ensureSchema());

      socialService = social;

      yield* Effect.logInfo("[API] Services Initialized");

      return Layer.succeed(SocialServiceTag, social);
    }),

  createRouter: (builder, plugins) => {
    socialService?.attachTwitter(plugins.twitter ? () => plugins.twitter.client() : undefined);
    socialService?.attachConnectors(
      plugins.connectors
        ? (userId: string) => plugins.connectors!.client({ userId }) as unknown
        : undefined,
    );

    return {
      ping: builder.ping.effect(function* () {
        return yield* Effect.succeed({
          status: "ok",
          timestamp: new Date().toISOString(),
        });
      }),

      reloadConfig: builder.reloadConfig.effect(function* () {
        return yield* Effect.succeed({
          status: "pending" as const,
          note: "restart host to pick up new config",
        });
      }),

      social: {
        accounts: {
          list: builder.social.accounts.list.effect(function* ({ context }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            const accounts = yield* Effect.promise(() => social.listAccounts(auth.userId));
            return { accounts };
          }),

          connect: builder.social.accounts.connect.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.connectAccount(auth.userId, input));
          }),

          callback: builder.social.accounts.callback.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() =>
              social.completeConnect(
                auth.userId,
                input,
                context.near?.primaryAccountId ?? undefined,
              ),
            );
          }),

          disconnect: builder.social.accounts.disconnect.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.disconnectAccount(auth.userId, input));
          }),

          refresh: builder.social.accounts.refresh.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.refreshAccount(auth.userId, input));
          }),

          status: builder.social.accounts.status.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.getAccountStatus(auth.userId, input));
          }),
        },

        posts: {
          create: builder.social.posts.create.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.createPost(auth.userId, input));
          }),

          reply: builder.social.posts.reply.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.replyToPost(auth.userId, input));
          }),

          quote: builder.social.posts.quote.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.quotePost(auth.userId, input));
          }),

          delete: builder.social.posts.delete.effect(function* ({ context, input }) {
            const auth = requireAuthContext(context);
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.deletePost(auth.userId, input));
          }),
        },

        activity: {
          leaderboard: builder.social.activity.leaderboard.effect(function* ({ input }) {
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.getLeaderboard(input));
          }),

          accountPosts: builder.social.activity.accountPosts.effect(function* ({ input }) {
            const social = yield* SocialServiceTag;
            return yield* Effect.promise(() => social.getAccountPosts(input.signerId, input.query));
          }),
        },
      },
    };
  },
});
