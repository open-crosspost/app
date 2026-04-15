import { oc } from "@orpc/contract";
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, UNAUTHORIZED } from "every-plugin/errors";
import { z } from "zod";

const registryMetadataSchema = z.object({
  claimedBy: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  repoUrl: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  updatedAt: z.iso.datetime().nullable(),
});

const registryMetadataDraftInputSchema = z.object({
  accountId: z.string(),
  gatewayId: z.string(),
  claimedBy: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  repoUrl: z.string().url().optional(),
  homepageUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
});

const registryAppSummarySchema = z.object({
  accountId: z.string(),
  gatewayId: z.string(),
  canonicalKey: z.string(),
  canonicalConfigUrl: z.string().url(),
  startCommand: z.string(),
  domain: z.string().nullable(),
  openUrl: z.string().url().nullable(),
  hostUrl: z.string().url().nullable(),
  uiUrl: z.string().url().nullable(),
  uiSsrUrl: z.string().url().nullable(),
  apiUrl: z.string().url().nullable(),
  extends: z.string().nullable(),
  status: z.enum(["ready", "invalid"]),
  metadata: registryMetadataSchema.nullable(),
});

const registryAppDetailSchema = registryAppSummarySchema.extend({
  metadata: registryMetadataSchema.nullable(),
  metadataKey: z.string(),
  metadataContractId: z.string(),
  metadataFastKvUrl: z.string().url(),
  resolvedConfig: z.record(z.string(), z.unknown()),
});

const registryMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const preparedRegistryMetadataWriteSchema = z.object({
  contractId: z.string(),
  methodName: z.literal("__fastdata_kv"),
  key: z.string(),
  manifest: registryMetadataSchema,
  args: z.record(z.string(), z.string()),
  gas: z.string(),
  attachedDeposit: z.string(),
});

const registryRelayResultSchema = z.object({
  transactionHash: z.string().nullable(),
  relayerAccountId: z.string(),
  senderId: z.string(),
});

export const contract = oc.router({
  ping: oc.route({ method: "GET", path: "/ping" }).output(
    z.object({
      status: z.literal("ok"),
      timestamp: z.iso.datetime(),
    }),
  ),

  // Health check for auth services
  authHealth: oc
    .route({ method: "GET", path: "/auth/health" })
    .output(
      z.object({
        status: z.string(),
        emailConfigured: z.boolean(),
        smsConfigured: z.boolean(),
      }),
    )
    .errors({ UNAUTHORIZED }),

  listRegistryApps: oc
    .route({ method: "GET", path: "/v1/registry/apps" })
    .input(
      z.object({
        q: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
      }),
    )
    .output(
      z.object({
        data: z.array(registryAppSummarySchema),
        meta: registryMetaSchema,
      }),
    )
    .errors({ BAD_REQUEST }),

  getRegistryAppsByAccount: oc
    .route({ method: "GET", path: "/v1/registry/apps/account/{accountId}" })
    .input(z.object({ accountId: z.string() }))
    .output(
      z.object({
        data: z.array(registryAppSummarySchema),
        meta: registryMetaSchema,
      }),
    )
    .errors({ NOT_FOUND }),

  getRegistryApp: oc
    .route({ method: "GET", path: "/v1/registry/apps/{accountId}/{gatewayId}" })
    .input(
      z.object({
        accountId: z.string(),
        gatewayId: z.string(),
      }),
    )
    .output(z.object({ data: registryAppDetailSchema }))
    .errors({ NOT_FOUND }),

  getRegistryAppByHost: oc
    .route({ method: "GET", path: "/v1/registry/apps/by-host" })
    .input(
      z.object({
        hostUrl: z.string().url(),
      }),
    )
    .output(z.object({ data: registryAppDetailSchema }))
    .errors({ NOT_FOUND }),

  getRegistryStatus: oc.route({ method: "GET", path: "/v1/registry/status" }).output(
    z.object({
      discoveredApps: z.number().int().nonnegative(),
      discoveryKey: z.string(),
      metadataContractId: z.string(),
      metadataFastKvUrl: z.string().url(),
      relayEnabled: z.boolean(),
      relayAccountId: z.string().nullable(),
      timestamp: z.iso.datetime(),
    }),
  ),

  prepareRegistryMetadataWrite: oc
    .route({ method: "POST", path: "/v1/registry/apps/{accountId}/{gatewayId}/metadata/prepare" })
    .input(registryMetadataDraftInputSchema)
    .output(z.object({ data: preparedRegistryMetadataWriteSchema }))
    .errors({ BAD_REQUEST }),

  relayRegistryMetadataWrite: oc
    .route({ method: "POST", path: "/v1/registry/metadata/relay" })
    .input(z.object({ payload: z.string() }))
    .output(z.object({ data: registryRelayResultSchema }))
    .errors({ BAD_REQUEST, FORBIDDEN, UNAUTHORIZED }),

  // API Keys (Organization-scoped) - These integrate with Better Auth API keys
  listApiKeys: oc
    .route({ method: "GET", path: "/organizations/{organizationId}/api-keys" })
    .input(z.object({ organizationId: z.string() }))
    .output(
      z.object({
        keys: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            prefix: z.string(),
            permissions: z.array(z.string()),
            lastUsed: z.iso.datetime().nullable(),
            createdAt: z.iso.datetime(),
            expiresAt: z.iso.datetime().nullable(),
          }),
        ),
      }),
    )
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  createApiKey: oc
    .route({ method: "POST", path: "/organizations/{organizationId}/api-keys" })
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(100),
        permissions: z.array(z.string()).optional(),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        key: z.string(),
        prefix: z.string(),
        permissions: z.array(z.string()),
        createdAt: z.iso.datetime(),
        expiresAt: z.iso.datetime().nullable(),
      }),
    )
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN, BAD_REQUEST }),

  deleteApiKey: oc
    .route({ method: "DELETE", path: "/api-keys/{keyId}" })
    .input(z.object({ keyId: z.string() }))
    .output(z.object({ deleted: z.boolean() }))
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  // Organization Members - thin bridge for Better Auth
  listOrgMembers: oc
    .route({ method: "GET", path: "/organizations/{organizationId}/members" })
    .input(z.object({ organizationId: z.string() }))
    .output(
      z.object({
        members: z.array(
          z.object({
            id: z.string(),
            userId: z.string(),
            role: z.enum(["owner", "admin", "member"]),
            name: z.string().nullable(),
            email: z.string().nullable(),
            createdAt: z.iso.datetime(),
          }),
        ),
      }),
    )
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  // Organization Invitations - thin bridge for Better Auth
  listOrgInvitations: oc
    .route({ method: "GET", path: "/organizations/{organizationId}/invitations" })
    .input(z.object({ organizationId: z.string() }))
    .output(
      z.object({
        invitations: z.array(
          z.object({
            id: z.string(),
            email: z.string(),
            role: z.enum(["admin", "member"]),
            status: z.enum(["pending", "accepted", "rejected", "expired"]),
            expiresAt: z.iso.datetime(),
            createdAt: z.iso.datetime(),
          }),
        ),
      }),
    )
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  cancelInvitation: oc
    .route({ method: "DELETE", path: "/invitations/{invitationId}" })
    .input(z.object({ invitationId: z.string() }))
    .output(z.object({ cancelled: z.boolean() }))
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  resendInvitation: oc
    .route({ method: "POST", path: "/invitations/{invitationId}/resend" })
    .input(z.object({ invitationId: z.string() }))
    .output(z.object({ sent: z.boolean() }))
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  // KV endpoints (app-specific data)
  listKeys: oc
    .route({ method: "GET", path: "/kv" })
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }),
    )
    .output(
      z.object({
        keys: z.array(
          z.object({
            key: z.string(),
            updatedAt: z.iso.datetime(),
          }),
        ),
        total: z.number(),
        hasMore: z.boolean(),
      }),
    )
    .errors({ UNAUTHORIZED }),

  getValue: oc
    .route({ method: "GET", path: "/kv/{key}" })
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .output(
      z.object({
        key: z.string(),
        value: z.string(),
        updatedAt: z.iso.datetime(),
      }),
    )
    .errors({ NOT_FOUND, FORBIDDEN, UNAUTHORIZED }),

  setValue: oc
    .route({ method: "POST", path: "/kv/{key}" })
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    )
    .output(
      z.object({
        key: z.string(),
        value: z.string(),
        created: z.boolean(),
      }),
    )
    .errors({ FORBIDDEN, UNAUTHORIZED }),

  deleteKey: oc
    .route({ method: "DELETE", path: "/kv/{key}" })
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .output(
      z.object({
        key: z.string(),
        deleted: z.boolean(),
      }),
    )
    .errors({ NOT_FOUND, FORBIDDEN, UNAUTHORIZED }),

  publicError: oc
    .route({ method: "GET", path: "/public/error" })
    .output(z.object({ message: z.string() }))
    .errors({ UNAUTHORIZED, BAD_REQUEST }),

  protectedError: oc
    .route({ method: "GET", path: "/protected/error" })
    .output(z.object({ message: z.string(), accountId: z.string() }))
    .errors({ NOT_FOUND, UNAUTHORIZED }),

  // Projects
  listProjects: oc
    .route({ method: "GET", path: "/v1/projects" })
    .input(
      z.object({
        organizationId: z.string().optional(),
        ownerId: z.string().optional(),
        visibility: z.enum(["private", "unlisted", "public"]).optional(),
        status: z.enum(["active", "paused", "archived"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            id: z.string(),
            ownerId: z.string(),
            organizationId: z.string().nullable(),
            slug: z.string(),
            title: z.string(),
            description: z.string().nullable(),
            status: z.enum(["active", "paused", "archived"]),
            visibility: z.enum(["private", "unlisted", "public"]),
            createdAt: z.iso.datetime(),
            updatedAt: z.iso.datetime(),
          }),
        ),
        meta: z.object({
          total: z.number().int().nonnegative(),
          hasMore: z.boolean(),
          nextCursor: z.string().nullable(),
        }),
      }),
    )
    .errors({ BAD_REQUEST }),

  getProject: oc
    .route({ method: "GET", path: "/v1/projects/{id}" })
    .input(z.object({ id: z.string() }))
    .output(
      z.object({
        data: z.object({
          id: z.string(),
          ownerId: z.string(),
          organizationId: z.string().nullable(),
          slug: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          status: z.enum(["active", "paused", "archived"]),
          visibility: z.enum(["private", "unlisted", "public"]),
          createdAt: z.iso.datetime(),
          updatedAt: z.iso.datetime(),
          apps: z.array(
            z.object({
              id: z.string(),
              projectId: z.string(),
              accountId: z.string(),
              gatewayId: z.string(),
              position: z.number().int(),
              createdByUserId: z.string(),
              createdAt: z.iso.datetime(),
            }),
          ),
        }),
      }),
    )
    .errors({ NOT_FOUND }),

  createProject: oc
    .route({ method: "POST", path: "/v1/projects" })
    .input(
      z.object({
        title: z.string().min(1).max(200),
        slug: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
        description: z.string().max(1000).optional(),
        visibility: z.enum(["private", "unlisted", "public"]).optional(),
        organizationId: z.string().optional(),
      }),
    )
    .output(
      z.object({
        id: z.string(),
        ownerId: z.string(),
        organizationId: z.string().nullable(),
        slug: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        status: z.enum(["active", "paused", "archived"]),
        visibility: z.enum(["private", "unlisted", "public"]),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
      }),
    )
    .errors({ UNAUTHORIZED, FORBIDDEN, BAD_REQUEST }),

  updateProject: oc
    .route({ method: "PATCH", path: "/v1/projects/{id}" })
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        status: z.enum(["active", "paused", "archived"]).optional(),
        visibility: z.enum(["private", "unlisted", "public"]).optional(),
      }),
    )
    .output(
      z.object({
        id: z.string(),
        ownerId: z.string(),
        organizationId: z.string().nullable(),
        slug: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        status: z.enum(["active", "paused", "archived"]),
        visibility: z.enum(["private", "unlisted", "public"]),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
      }),
    )
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN, BAD_REQUEST }),

  deleteProject: oc
    .route({ method: "DELETE", path: "/v1/projects/{id}" })
    .input(z.object({ id: z.string() }))
    .output(z.object({ deleted: z.boolean() }))
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  listProjectApps: oc
    .route({ method: "GET", path: "/v1/projects/{projectId}/apps" })
    .input(z.object({ projectId: z.string() }))
    .output(
      z.object({
        data: z.array(
          z.object({
            id: z.string(),
            projectId: z.string(),
            accountId: z.string(),
            gatewayId: z.string(),
            position: z.number().int(),
            createdByUserId: z.string(),
            createdAt: z.iso.datetime(),
          }),
        ),
      }),
    )
    .errors({ NOT_FOUND }),

  linkAppToProject: oc
    .route({ method: "POST", path: "/v1/projects/{projectId}/apps" })
    .input(
      z.object({
        projectId: z.string(),
        accountId: z.string(),
        gatewayId: z.string(),
      }),
    )
    .output(
      z.object({
        id: z.string(),
        projectId: z.string(),
        accountId: z.string(),
        gatewayId: z.string(),
        position: z.number().int(),
        createdByUserId: z.string(),
        createdAt: z.iso.datetime(),
      }),
    )
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  unlinkAppFromProject: oc
    .route({ method: "DELETE", path: "/v1/projects/{projectId}/apps/{accountId}/{gatewayId}" })
    .input(
      z.object({
        projectId: z.string(),
        accountId: z.string(),
        gatewayId: z.string(),
      }),
    )
    .output(z.object({ deleted: z.boolean() }))
    .errors({ UNAUTHORIZED, NOT_FOUND, FORBIDDEN }),

  listProjectsForApp: oc
    .route({ method: "GET", path: "/v1/apps/{accountId}/{gatewayId}/projects" })
    .input(
      z.object({
        accountId: z.string(),
        gatewayId: z.string(),
      }),
    )
    .output(
      z.object({
        data: z.array(
          z.object({
            id: z.string(),
            ownerId: z.string(),
            organizationId: z.string().nullable(),
            slug: z.string(),
            title: z.string(),
            description: z.string().nullable(),
            status: z.enum(["active", "paused", "archived"]),
            visibility: z.enum(["private", "unlisted", "public"]),
            createdAt: z.iso.datetime(),
            updatedAt: z.iso.datetime(),
          }),
        ),
      }),
    )
    .errors({ BAD_REQUEST }),
});

export type ContractType = typeof contract;
