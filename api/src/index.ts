import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { z } from "every-plugin/zod";
import type { Auth } from "host/src/services/auth";
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
    auth: z.custom<Auth>().optional(),
  }),

  contract,

  initialize: () =>
    Effect.sync(() => {
      console.log("[API] Services Initialized");
      return {};
    }),

  shutdown: () => Effect.log("[API] Shutdown"),

  createRouter: (_services, builder) => {
    return {
      ping: builder.ping.handler(async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
      })),

      reloadConfig: builder.reloadConfig.handler(async () => ({
        status: "pending" as const,
        note: "restart host to pick up new config",
      })),
    };
  },
});
