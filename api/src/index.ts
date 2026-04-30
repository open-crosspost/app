import { Effect } from "every-plugin/effect";
import { withPlugins } from "every-plugin";
import { z } from "every-plugin/zod";
import type { Auth } from "host/src/services/auth";
import type { PluginsClient } from "./plugins-client.gen";
import { contract } from "./contract";

export interface AuthContext {
  userId: string;
  user: {
    id: string;
    role?: string;
    email?: string;
    name?: string;
  };
  nearAccountId?: string;
  organizationId?: string;
  organizationRole?: string;
  reqHeaders?: Headers;
  auth: Auth;
}

export default withPlugins<PluginsClient>()({
  variables: z.object({
    baseUrl: z.string().url().default("https://api.opencrosspost.com"),
    timeout: z.number().min(1000).max(60000).default(10000),
  }),

  secrets: z.object({
    API_DATABASE_URL: z.string().default("file:./api.db"),
    API_DATABASE_AUTH_TOKEN: z.string().optional(),
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
    nearAccountId: z.string().optional(),
    nearAccounts: z
      .array(
        z.object({
          accountId: z.string(),
          network: z.string(),
          publicKey: z.string(),
          isPrimary: z.boolean().optional(),
        }),
      )
      .optional(),
    organizationId: z.string().optional(),
    organizationRole: z.string().optional(),
    reqHeaders: z.custom<Headers>().optional(),
    getRawBody: z.custom<() => Promise<string>>().optional(),
    auth: z.custom<Auth>().optional(),
  }),

  contract,

  initialize: (_config, plugins) =>
    Effect.gen(function* () {
      console.log("[API] Services Initialized");
      return { plugins };
    }),

  shutdown: () => Effect.log("[API] Shutdown"),

  createRouter: (deps, builder) => {
    const { plugins } = deps;

    const authRouter = builder.auth.router({
      authorizeNearAccount: builder.auth.authorizeNearAccount.handler(
        async ({ input }) => {
          const client = plugins.crosspost();
          return await client.auth.authorizeNearAccount(input);
        },
      ),

      getNearAuthorizationStatus: builder.auth.getNearAuthorizationStatus.handler(
        async () => {
          const client = plugins.crosspost();
          return await client.auth.getNearAuthorizationStatus();
        },
      ),

      loginToPlatform: builder.auth.loginToPlatform.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.auth.loginToPlatform(input);
      }),

      refreshToken: builder.auth.refreshToken.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.auth.refreshToken(input);
      }),

      refreshProfile: builder.auth.refreshProfile.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.auth.refreshProfile(input);
      }),

      getAuthStatus: builder.auth.getAuthStatus.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.auth.getAuthStatus(input);
      }),

      unauthorizeNear: builder.auth.unauthorizeNear.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.auth.unauthorizeNear(input);
      }),

      revokeAuth: builder.auth.revokeAuth.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.auth.revokeAuth(input);
      }),

      getConnectedAccounts: builder.auth.getConnectedAccounts.handler(async () => {
        const client = plugins.crosspost();
        return await client.auth.getConnectedAccounts();
      }),
    });

    const postRouter = builder.post.router({
      create: builder.post.create.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.post.create(input);
      }),

      delete: builder.post.delete.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.post.delete(input);
      }),

      repost: builder.post.repost.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.post.repost(input);
      }),

      quote: builder.post.quote.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.post.quote(input);
      }),

      reply: builder.post.reply.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.post.reply(input);
      }),

      like: builder.post.like.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.post.like(input);
      }),

      unlike: builder.post.unlike.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.post.unlike(input);
      }),
    });

    const activityRouter = builder.activity.router({
      getLeaderboard: builder.activity.getLeaderboard.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.activity.getLeaderboard(input);
      }),

      getAccountActivity: builder.activity.getAccountActivity.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.activity.getAccountActivity(input);
      }),

      getAccountPosts: builder.activity.getAccountPosts.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.activity.getAccountPosts(input);
      }),
    });

    const systemRouter = builder.system.router({
      getRateLimits: builder.system.getRateLimits.handler(async () => {
        const client = plugins.crosspost();
        return await client.system.getRateLimits();
      }),

      getEndpointRateLimit: builder.system.getEndpointRateLimit.handler(async ({ input }) => {
        const client = plugins.crosspost();
        return await client.system.getEndpointRateLimit(input);
      }),

      getHealthStatus: builder.system.getHealthStatus.handler(async () => {
        const client = plugins.crosspost();
        return await client.system.getHealthStatus();
      }),
    });

    const relayRouter = builder.relay.router({
      connect: builder.relay.connect.handler(async ({ input }) => {
        const client = plugins.relayer();
        return await client.connect(input);
      }),

      publish: builder.relay.publish.handler(async ({ input }) => {
        const client = plugins.relayer();
        return await client.publish(input);
      }),

      status: builder.relay.status.handler(async ({ input }) => {
        const client = plugins.relayer();
        return await client.status(input);
      }),
    });

    return builder.router({
      auth: authRouter,
      post: postRouter,
      activity: activityRouter,
      system: systemRouter,
      relay: relayRouter,
      ping: builder.ping.handler(async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
      })),
      reloadConfig: builder.reloadConfig.handler(async () => ({
        status: "pending" as const,
        note: "restart host to pick up new config",
      })),
    });
  },
});
