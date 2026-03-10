# oRPC Contracts and Patterns

Reference for oRPC contract definition patterns used in the everything-dev API.

## oRPC Basics

oRPC provides type-safe RPC with:
- Contract-first API definition
- Zod schema validation
- OpenAPI generation
- Client type inference

## Every-Plugin oRPC

We use `every-plugin/orpc` which wraps oRPC with additional utilities:

```typescript
import { oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
```

## Contract Structure

### Router Definition

```typescript
export const contract = oc.router({
  // Routes grouped by domain
  identity: {
    me: oc.route({ method: "GET", path: "/identity/me" })
      .output(z.object({ userId: z.string(), principals: z.array(...) }))
      .errors({ UNAUTHORIZED }),
  },
  
  workspaces: {
    listMine: oc.route({ method: "GET", path: "/workspaces" })
      .input(PageInput.extend({ q: z.string().optional() }))
      .output(z.object({ items: z.array(Workspace), nextCursor: z.string().nullish() })),
    get: oc.route({ method: "GET", path: "/workspaces/{id}" })
      .input(z.object({ id: UUID }))
      .output(Workspace)
      .errors({ NOT_FOUND, UNAUTHORIZED }),
  },
});
```

## Common Patterns

### Reusable Schemas

```typescript
// UUID validation
const UUID = z.string().uuid();

// ISO datetime
const ISODate = z.string().datetime();

// JSON object (accepts any JSON)
const Json = z.record(z.string(), z.unknown()).default({});

// Pagination input
const PageInput = z.object({
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(100).default(24),
});

// Permission set output
const PermissionSet = z.object({
  role: ResourceRole.nullish(),
  canRead: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canPublish: z.boolean(),
  canManageGrants: z.boolean(),
});

// Principal reference
const PrincipalRef = z.object({
  type: z.enum(["user", "organization", "team"]),
  id: z.string(),
});
```

### Resource Schemas with Permissions

```typescript
const Workspace = z.object({
  id: UUID,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: Visibility,
  kind: z.string(),
  attrs: Json.default({}),
  createdByUserId: z.string(),
  createdAt: ISODate,
  updatedAt: ISODate,
  permissions: PermissionSet,  // Every resource has permissions
});
```

### Nested Resources

```typescript
const ThingDetail = ThingCard.extend({
  content: z.unknown(),
  publications: z.array(Publication),
  relations: z.array(Edge),
  assets: z.array(ThingAsset),
});
```

## Error Definitions

```typescript
import { 
  BAD_REQUEST,
  FORBIDDEN, 
  NOT_FOUND,
  UNAUTHORIZED,
} from "every-plugin/errors";

const contract = oc.router({
  getThing: oc.route({ method: "GET", path: "/things/{id}" })
    .input(z.object({ id: UUID }))
    .output(ThingDetail)
    .errors({ NOT_FOUND, FORBIDDEN, UNAUTHORIZED }),
});
```

## Handler Implementation

In `api/src/index.ts`:

```typescript
export default createPlugin({
  contract,
  createRouter: (services, builder) => ({
    // Simple handler
    ping: builder.ping.handler(async () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
    })),
    
    // Handler with auth middleware
    getThing: builder.getThing
      .use(authed)  // Add middleware
      .handler(async ({ input, context, errors }) => {
        // Check permissions
        const check = await permissionService.check({
          resource: { kind: "thing", id: input.id },
          action: "read",
          context,
        });
        
        if (!check.allowed) {
          throw errors.FORBIDDEN({ message: "Access denied" });
        }
        
        // Fetch data
        const thing = await thingService.get(input.id);
        if (!thing) {
          throw errors.NOT_FOUND({
            message: "Thing not found",
            data: { resource: "thing", resourceId: input.id },
          });
        }
        
        return thing;
      }),
  }),
});
```

## Auth Middleware

```typescript
const authed = builder.middleware(({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED", { message: "Auth required" });
  }
  return next({ context: { userId: context.user.id } });
});
```

## Client Type Inference

In `ui/src/remote/orpc.ts`:

```typescript
import type { contract } from "../../api/src/contract";

export type ApiContract = typeof contract;
export type ApiClient = ContractRouterClient<ApiContract>;
```

The UI can then call:

```typescript
const { data } = await apiClient.workspaces.get({ id: "uuid" });
// data is fully typed as Workspace output
```

## Best Practices

1. **Always include permissions in output:** Every resource response should have a `permissions` field.

2. **Use consistent error codes:** Use the standard error codes from `every-plugin/errors`.

3. **Validate all inputs:** Use zod schemas for all route inputs including path params.

4. **Keep schemas DRY:** Define reusable schemas at module level, inline only for one-off cases.

5. **Version in path:** If API versioning needed, include in path like `/v1/workspaces`.

6. **Nested routes:** Group related routes logically in the router structure.

## Related Files

- `api/src/contract.ts` - Main contract definition
- `api/src/index.ts` - Handler implementations
- `ui/src/remote/orpc.ts` - Client setup
