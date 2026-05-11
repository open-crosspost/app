import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { createDatabaseDriver, type DatabaseDriver } from "./db";
import { requireAuthContext } from "./lib/auth";
import { SocialRepository } from "./social/repository";
import { SocialService } from "./social/service";

let databaseDriver: DatabaseDriver | null = null;

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
  auth: unknown;
}

export default createPlugin({
  variables: z.object({}),

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
    auth: z.unknown().optional(),
  }),

  contract,

  initialize: (config) =>
    Effect.promise(async () => {
      const driver = await createDatabaseDriver(config.secrets.API_DATABASE_URL);
      databaseDriver = driver;
      const socialRepository = new SocialRepository(driver.db);
      const social = new SocialService(socialRepository);

      await social.ensureSchema();

      console.log("[API] Services Initialized");

      return {
        db: driver.db,
        social,
      };
    }),

  shutdown: () =>
    Effect.promise(async () => {
      await databaseDriver?.close();
      databaseDriver = null;
      console.log("[API] Shutdown");
    }),

  createRouter: (services, builder) => {
    return builder.router({
      ping: builder.ping.handler(async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
      })),

      reloadConfig: builder.reloadConfig.handler(async () => ({
        status: "pending" as const,
        note: "restart host to pick up new config",
      })),

      social: builder.social.router({
        accounts: builder.social.accounts.router({
          list: builder.social.accounts.list.handler(async ({ context }) => {
            const auth = requireAuthContext(context);
            const accounts = await services.social.listAccounts(auth.userId);
            return { accounts };
          }),

          connect: builder.social.accounts.connect.handler(async ({ context, input }) => {
            const auth = requireAuthContext(context);
            return await services.social.connectAccount(auth.userId, input);
          }),

          disconnect: builder.social.accounts.disconnect.handler(async ({ context, input }) => {
            const auth = requireAuthContext(context);
            return await services.social.disconnectAccount(auth.userId, input);
          }),

          refresh: builder.social.accounts.refresh.handler(async ({ context, input }) => {
            const auth = requireAuthContext(context);
            return await services.social.refreshAccount(auth.userId, input);
          }),

          status: builder.social.accounts.status.handler(async ({ context, input }) => {
            const auth = requireAuthContext(context);
            return await services.social.getAccountStatus(auth.userId, input);
          }),
        }),

        posts: builder.social.posts.router({
          create: builder.social.posts.create.handler(async ({ context, input }) => {
            const auth = requireAuthContext(context);
            return await services.social.createPost(auth.userId, input);
          }),

          reply: builder.social.posts.reply.handler(async ({ context, input }) => {
            const auth = requireAuthContext(context);
            return await services.social.replyToPost(auth.userId, input);
          }),

          quote: builder.social.posts.quote.handler(async ({ context, input }) => {
            const auth = requireAuthContext(context);
            return await services.social.quotePost(auth.userId, input);
          }),

          delete: builder.social.posts.delete.handler(async ({ context, input }) => {
            const auth = requireAuthContext(context);
            return await services.social.deletePost(auth.userId, input);
          }),
        }),

        activity: builder.social.activity.router({
          leaderboard: builder.social.activity.leaderboard.handler(async ({ input }) => {
            return await services.social.getLeaderboard(input);
          }),

          accountPosts: builder.social.activity.accountPosts.handler(async ({ input }) => {
            return await services.social.getAccountPosts(input.signerId, input.query);
          }),
        }),
      }),
    });
  },
});
