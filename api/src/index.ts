import { createPlugin } from "every-plugin";
import { Cause, Effect, Exit, Layer } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { DatabaseLive } from "./db/layer";
import { KvService, KvServiceLive } from "./services/kv";

// Extended context with unified identity model
export interface AuthContext {
  // Core identity - always present for authenticated users
  userId: string;
  user: {
    id: string;
    role?: string;
    email?: string;
    name?: string;
  };

  // Public identity (NEAR) - optional, user selects active account
  nearAccountId?: string;
  nearAccounts?: Array<{
    accountId: string;
    network: string;
    isPrimary: boolean;
  }>;

  // Organization context
  organizationId?: string;
  organizationRole?: string;
}

export default createPlugin({
  variables: z.object({}),

  secrets: z.object({
    API_DATABASE_URL: z.string().default("file:./api.db"),
    API_DATABASE_AUTH_TOKEN: z.string().optional(),
  }),

  context: z.object({
    // Core identity - unified user model
    userId: z.string().optional(),
    user: z
      .object({
        id: z.string(),
        role: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
      })
      .optional(),

    // Public identity (NEAR) - optional capability
    nearAccountId: z.string().optional(),
    nearAccounts: z
      .array(
        z.object({
          accountId: z.string(),
          network: z.string(),
          isPrimary: z.boolean(),
        }),
      )
      .optional(),

    // Organization context
    organizationId: z.string().optional(),
    organizationRole: z.string().optional(),

    // Request utilities
    reqHeaders: z.custom<Headers>().optional(),
    getRawBody: z.custom<() => Promise<string>>().optional(),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const Database = DatabaseLive(
        config.secrets.API_DATABASE_URL,
        config.secrets.API_DATABASE_AUTH_TOKEN,
      );

      const Services = KvServiceLive.pipe(Layer.provide(Database));

      const services = yield* Effect.provide(KvService, Services);

      console.log("[API] Services Initialized");
      return services;
    }),

  shutdown: () => Effect.log("[API] Shutdown"),

  createRouter: (services, builder) => {
    // Generic auth - requires valid user session (any auth method)
    const requireAuth = builder.middleware(async ({ context, next }) => {
      if (!context.user || !context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication required",
          data: {
            authType: "session",
            hint: "Sign in with NEAR, passkey, email, phone, or anonymous",
          },
        });
      }
      return next({
        context: {
          userId: context.userId,
          user: context.user,
          nearAccountId: context.nearAccountId,
          organizationId: context.organizationId,
          organizationRole: context.organizationRole,
        } as AuthContext,
      });
    });

    // NEAR-specific - requires linked NEAR wallet
    const requireNearAccount = builder.middleware(async ({ context, next }) => {
      if (!context.user || !context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication required",
          data: { authType: "session" },
        });
      }

      if (!context.nearAccountId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "NEAR wallet required",
          data: {
            authType: "near",
            hint: "Link a NEAR wallet to perform this action",
          },
        });
      }

      return next({
        context: {
          userId: context.userId,
          user: context.user,
          nearAccountId: context.nearAccountId,
        } as AuthContext,
      });
    });

    return {
      ping: builder.ping.handler(async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
      })),

      // Auth health check - shows email/SMS configuration status
      authHealth: builder.authHealth.use(requireAuth).handler(async () => ({
        status: "ok",
        emailConfigured: !!process.env.EMAIL_PROVIDER,
        smsConfigured: !!process.env.SMS_PROVIDER,
      })),

      // Generic protected endpoint - any auth method
      protected: builder.protected.use(requireAuth).handler(async ({ context }) => ({
        message: "Protected data",
        accountId: context.nearAccountId || context.userId,
        timestamp: new Date().toISOString(),
      })),

      // NEAR-specific endpoint - requires linked wallet
      protectedNear: builder.protected.use(requireNearAccount).handler(async ({ context }) => ({
        message: "NEAR-only data",
        accountId: context.nearAccountId!,
        timestamp: new Date().toISOString(),
      })),

      // KV endpoints
      listKeys: builder.listKeys.use(requireNearAccount).handler(async ({ input, context }) => {
        const exit = await Effect.runPromiseExit(
          services.listKeys(context.nearAccountId!, input.limit, input.offset),
        );

        if (Exit.isFailure(exit)) {
          const squashed = Cause.squash(exit.cause);
          if (squashed instanceof ORPCError) {
            throw squashed;
          }
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: squashed instanceof Error ? squashed.message : String(squashed),
            data: {
              originalError: squashed instanceof Error ? squashed.message : String(squashed),
            },
          });
        }

        return exit.value;
      }),

      getValue: builder.getValue
        .use(requireNearAccount)
        .handler(async ({ input, context, errors }) => {
          const exit = await Effect.runPromiseExit(
            services.getValue(input.key, context.nearAccountId!),
          );

          if (Exit.isFailure(exit)) {
            const squashed = Cause.squash(exit.cause);
            if (squashed instanceof ORPCError) {
              if (squashed.code === "NOT_FOUND") {
                throw errors.NOT_FOUND({
                  message: "Key not found",
                  data: { resource: "kv", resourceId: input.key },
                });
              }
              if (squashed.code === "FORBIDDEN") {
                throw errors.FORBIDDEN({
                  message: "Access denied",
                  data: { action: "read" },
                });
              }
              throw squashed;
            }
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: squashed instanceof Error ? squashed.message : String(squashed),
              data: {
                originalError: squashed instanceof Error ? squashed.message : String(squashed),
              },
            });
          }

          return exit.value;
        }),

      setValue: builder.setValue
        .use(requireNearAccount)
        .handler(async ({ input, context, errors }) => {
          const exit = await Effect.runPromiseExit(
            services.setValue(input.key, input.value, context.nearAccountId!),
          );

          if (Exit.isFailure(exit)) {
            const squashed = Cause.squash(exit.cause);
            if (squashed instanceof ORPCError) {
              if (squashed.code === "FORBIDDEN") {
                throw errors.FORBIDDEN({
                  message: "Access denied",
                  data: { action: "write" },
                });
              }
              throw squashed;
            }
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: squashed instanceof Error ? squashed.message : String(squashed),
              data: {
                originalError: squashed instanceof Error ? squashed.message : String(squashed),
              },
            });
          }

          return exit.value;
        }),

      deleteKey: builder.deleteKey
        .use(requireNearAccount)
        .handler(async ({ input, context, errors }) => {
          const exit = await Effect.runPromiseExit(
            services.deleteKey(input.key, context.nearAccountId!),
          );

          if (Exit.isFailure(exit)) {
            const squashed = Cause.squash(exit.cause);
            if (squashed instanceof ORPCError) {
              if (squashed.code === "NOT_FOUND") {
                throw errors.NOT_FOUND({
                  message: "Key not found",
                  data: { resource: "kv", resourceId: input.key },
                });
              }
              if (squashed.code === "FORBIDDEN") {
                throw errors.FORBIDDEN({
                  message: "Access denied",
                  data: { action: "delete" },
                });
              }
              throw squashed;
            }
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: squashed instanceof Error ? squashed.message : String(squashed),
              data: {
                originalError: squashed instanceof Error ? squashed.message : String(squashed),
              },
            });
          }

          return exit.value;
        }),

      publicError: builder.publicError.handler(() => {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Test UNAUTHORIZED error - thrown directly from handler",
          data: {
            provider: "test-provider",
            action: "test-action",
            timestamp: new Date().toISOString(),
          },
        });
      }),

      protectedError: builder.protectedError.use(requireAuth).handler(() => {
        throw new ORPCError("NOT_FOUND", {
          message: "Test NOT_FOUND error - thrown after auth middleware",
          data: {
            resource: "test-resource",
            resourceId: "test-id-123",
            timestamp: new Date().toISOString(),
          },
        });
      }),

      // API Keys - placeholder for now (integrates with Better Auth API keys)
      listApiKeys: builder.listApiKeys.use(requireAuth).handler(async () => ({
        keys: [],
      })),

      createApiKey: builder.createApiKey.use(requireAuth).handler(async ({ input }) => {
        const keyId = crypto.randomUUID();
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
          : null;
        return {
          id: keyId,
          name: input.name,
          key: `api_${keyId}_${crypto.randomUUID().slice(0, 8)}`,
          prefix: "api_",
          permissions: input.permissions || ["read"],
          createdAt: new Date().toISOString(),
          expiresAt,
        };
      }),

      deleteApiKey: builder.deleteApiKey.use(requireAuth).handler(async () => ({
        deleted: true,
      })),
    };
  },
});
