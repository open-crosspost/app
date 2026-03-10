# Milestone 2: Core App Schema + Browse Pages

**Goal:** Build the app graph foundation: types, workspaces, things. Replace KV demo with core resource browsing and detail inspection.

**Phase:** Core domain layer. This proves the generic inspector pattern before adding complexity.

---

## Exit Criteria

- [ ] App DB schema for `type_defs`, `workspaces`, `things`, `workspace_grants`
- [ ] All resource detail pages render every API field
- [ ] Generic inspector pattern proven across 3+ resources
- [ ] Raw JSON sections present on every detail page
- [ ] Create flows work end-to-end

---

## API Schema Files

### `api/src/db/schema/type-defs.ts` [NEW]

```typescript
export const typeDefs = sqliteTable("type_defs", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  pluginKey: text("plugin_key"),
  pluginMode: text("plugin_mode").notNull().default("none"),
  capabilities: text("capabilities").notNull().default("[]"), // JSON array
  jsonSchema: text("json_schema").notNull().default("{}"), // JSON
  uiSchema: text("ui_schema").notNull().default("{}"), // JSON
  searchConfig: text("search_config").notNull().default("{}"), // JSON
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

**Indexes:**
- `typeDefs.key` unique

---

### `api/src/db/schema/workspaces.ts` [NEW]

```typescript
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  visibility: text("visibility").notNull().default("private"),
  kind: text("kind").notNull().default("standard"),
  attrs: text("attrs").notNull().default("{}"), // JSON
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const workspaceGrants = sqliteTable("workspace_grants", {
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  principalType: text("principal_type").notNull(), // "user" | "organization" | "team"
  principalId: text("principal_id").notNull(),
  role: text("role").notNull().default("viewer"),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.workspaceId, table.principalType, table.principalId] }),
}));
```

**Indexes:**
- `workspaces.slug` unique
- `workspace_grants.workspace_id` + `principal_type` + `principal_id` unique composite

---

### `api/src/db/schema/things.ts` [NEW]

```typescript
export const things = sqliteTable("things", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  typeId: text("type_id").notNull().references(() => typeDefs.id, { onDelete: "restrict" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  status: text("status").notNull().default("draft"), // "draft" | "published" | "archived"
  visibility: text("visibility").notNull().default("private"), // "private" | "unlisted" | "public"
  attrs: text("attrs").notNull().default("{}"), // JSON
  content: text("content").notNull().default("{}"), // JSON
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }),
}, (table) => ({
  workspaceSlugUnique: uniqueIndex("things_workspace_slug_unique").on(table.workspaceId, table.slug),
}));
```

**Indexes:**
- `things(workspace_id, slug)` unique
- `things.type_id`
- `things.workspace_id`
- `things.status`
- `things.visibility`

---

### `api/src/db/schema/index.ts` [NEW]

Re-export all schema tables and relations.

---

### `api/src/db/migrations/0001_app_graph.sql` [NEW]

Migration for all app schema tables.

---

## API Services

### `api/src/services/types.ts` [NEW]

**Exports:**
```typescript
export const TypesService = {
  list: async (db: Database, pagination: PageInput) => {
    // Return all enabled type defs
  },
  get: async (db: Database, key: string) => {
    // Return single type def
  },
};
```

**Done when:**
- Can list all types
- Can get type with full schema fields

---

### `api/src/services/workspaces.ts` [NEW]

**Exports:**
```typescript
export const WorkspacesService = {
  listMine: async (
    db: Database,
    principalSet: PrincipalSet,
    pagination: PageInput,
    q?: string
  ) => {
    // List workspaces accessible by any principal in set
    // Consider grants and ownership
  },
  get: async (db: Database, id: string, principalSet: PrincipalSet) => {
    // Return workspace with permissions
    // Check grants or ownership
  },
  getBySlug: async (db: Database, slug: string, principalSet: PrincipalSet) => {
    // Return workspace with permissions
  },
  create: async (
    db: Database,
    input: WorkspaceCreateInput,
    userId: string
  ) => {
    // Create workspace with owner grant
  },
  update: async (
    db: Database,
    id: string,
    input: WorkspaceUpdateInput,
    principalSet: PrincipalSet
  ) => {
    // Update workspace fields (check edit permission)
  },
  listGrants: async (db: Database, workspaceId: string, principalSet: PrincipalSet) => {
    // List all grants for workspace (check manageGrants)
  },
  upsertGrant: async (
    db: Database,
    workspaceId: string,
    principal: PrincipalRef,
    role: ResourceRole,
    createdByUserId: string
  ) => {
    // Upsert grant
  },
  removeGrant: async (
    db: Database,
    workspaceId: string,
    principal: PrincipalRef
  ) => {
    // Remove grant
  },
  browseThings: async (
    db: Database,
    workspaceId: string,
    filter: ThingFilter,
    pagination: PageInput,
    principalSet: PrincipalSet
  ) => {
    // List things in workspace with filter
  },
};
```

**Done when:**
- All workspace operations work
- Grants properly control access
- Browse respects filters and pagination

---

### `api/src/services/things.ts` [NEW]

**Exports:**
```typescript
export const ThingsService = {
  list: async (
    db: Database,
    filter: ThingFilter,
    pagination: PageInput,
    principalSet: PrincipalSet
  ) => {
    // Global thing search (respects workspace visibility + grants)
  },
  get: async (db: Database, id: string, principalSet: PrincipalSet) => {
    // Return ThingDetail with all relations
    // Check workspace permissions + thing visibility
  },
  create: async (
    db: Database,
    input: ThingCreateInput,
    userId: string
  ) => {
    // Create thing in workspace (check workspace edit permission)
  },
  update: async (
    db: Database,
    id: string,
    input: ThingUpdateInput,
    principalSet: PrincipalSet
  ) => {
    // Update thing (check edit permission)
  },
  archive: async (db: Database, id: string, principalSet: PrincipalSet) => {
    // Archive thing (check delete permission or ownership)
  },
};
```

**ThingDetail joins needed:**
- Publications (left join)
- Edges (left join)  
- Assets via thing_assets (left join + join to assets)

**Done when:**
- Thing detail returns complete graph data
- All workspace/visibility permissions respected

---

## API Contract Updates

### `api/src/contract.ts` [MODIFY]

Add to contract:

```typescript
// Types
"types.list": oc.route(...).output(z.array(TypeDef)),
"types.get": oc.route(...).input({ key: z.string() }).output(TypeDef),

// Workspaces
"workspaces.listMine": oc.route(...).input(PageInput.extend({ q: z.string().optional() })),
"workspaces.get": oc.route(...).input({ id: UUID }).output(Workspace),
"workspaces.getBySlug": oc.route(...).input({ slug: z.string() }).output(Workspace),
"workspaces.create": oc.route(...).input(WorkspaceCreateInput).output(Workspace),
"workspaces.update": oc.route(...).input(WorkspaceUpdateInput).output(Workspace),
"workspaces.grants.list": oc.route(...).input({ workspaceId: UUID }).output(z.array(Grant)),
"workspaces.grants.upsert": oc.route(...).input(GrantUpsertInput).output(Grant),
"workspaces.grants.remove": oc.route(...).input(GrantRemoveInput).output(z.object({ ok: z.boolean() })),
"workspaces.browseThings": oc.route(...).input(PageInput.extend({ workspaceId: UUID, filter: ThingFilter })),

// Things
"things.list": oc.route(...).input(PageInput.extend({ filter: ThingFilter })),
"things.get": oc.route(...).input({ id: UUID }).output(ThingDetail),
"things.create": oc.route(...).input(ThingCreateInput).output(ThingDetail),
"things.update": oc.route(...).input(ThingUpdateInput).output(ThingDetail),
"things.archive": oc.route(...).input({ id: UUID }).output(z.object({ ok: z.boolean() })),
```

**Schemas needed:**
- `TypeDef` (full schema from contract spec)
- `Workspace` (with permissions)
- `ThingCard` (summary for lists)
- `ThingDetail` (full with relations)
- `PageInput`, `ThingFilter`, `Grant` etc.

---

### `api/src/index.ts` [MODIFY]

Wire new handlers to services.

---

## UI Query Factories

### `ui/src/lib/queries/types.ts` [NEW]

```typescript
export const typesListQueryOptions = () =>
  queryOptions({
    queryKey: ["types", "list"],
    queryFn: () => apiClient["types.list"](),
  });

export const typeDetailQueryOptions = (key: string) =>
  queryOptions({
    queryKey: ["types", "detail", key],
    queryFn: () => apiClient["types.get"]({ key }),
  });
```

---

### `ui/src/lib/queries/workspaces.ts` [NEW]

```typescript
export const workspacesListMineQueryOptions = (pagination: PageInput, q?: string) =>
  queryOptions({
    queryKey: ["workspaces", "listMine", pagination, q],
    queryFn: () => apiClient["workspaces.listMine"]({ ...pagination, q }),
  });

export const workspaceDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["workspaces", "detail", id],
    queryFn: () => apiClient["workspaces.get"]({ id }),
  });

export const workspaceBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["workspaces", "bySlug", slug],
    queryFn: () => apiClient["workspaces.getBySlug"]({ slug }),
  });

export const workspaceGrantsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ["workspaces", "grants", workspaceId],
    queryFn: () => apiClient["workspaces.grants.list"]({ workspaceId }),
  });

export const workspaceThingsQueryOptions = (workspaceId: string, filter: ThingFilter, pagination: PageInput) =>
  queryOptions({
    queryKey: ["workspaces", "things", workspaceId, filter, pagination],
    queryFn: () => apiClient["workspaces.browseThings"]({ workspaceId, filter, ...pagination }),
  });
```

---

### `ui/src/lib/queries/things.ts` [NEW]

```typescript
export const thingsListQueryOptions = (filter: ThingFilter, pagination: PageInput) =>
  queryOptions({
    queryKey: ["things", "list", filter, pagination],
    queryFn: () => apiClient["things.list"]({ filter, ...pagination }),
  });

export const thingDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["things", "detail", id],
    queryFn: () => apiClient["things.get"]({ id }),
  });
```

---

### `ui/src/lib/search-schemas.ts` [NEW]

```typescript
export const thingListSearchSchema = z.object({
  q: z.string().optional(),
  typeKeys: z.array(z.string()).optional(),
  status: z.array(z.enum(["draft", "published", "archived"])).optional(),
  visibility: z.array(z.enum(["private", "unlisted", "public"])).optional(),
  sort: z.enum(["recent", "updated", "published", "trending"]).default("recent"),
  cursor: z.string().nullish(),
  limit: z.number().min(1).max(100).default(24),
});

export const workspaceThingSearchSchema = thingListSearchSchema.omit({});

export const pageInputSchema = z.object({
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(100).default(24),
});
```

---

## UI Generic Components

### `ui/src/components/resource-meta-table.tsx` [NEW]

**Props:**
```typescript
interface ResourceMetaTableProps {
  rows: [string, React.ReactNode][];
}
```

**Responsibility:** Render key-value table for resource fields.

**Style:**
- Simple table layout
- Monospace for IDs, slugs, JSON
- Black borders, no decorations

---

### `ui/src/components/json-block.tsx` [NEW]

**Props:**
```typescript
interface JsonBlockProps {
  value: unknown;
  title?: string;
  collapsible?: boolean;
}
```

**Responsibility:** Pretty-print JSON with monospace.

---

### `ui/src/components/permission-panel.tsx` [NEW]

**Props:**
```typescript
interface PermissionPanelProps {
  permissions: PermissionSet;
}
```

**Responsibility:** Display role + boolean permission flags.

---

### `ui/src/components/generic-data-table.tsx` [NEW]

**Props:**
```typescript
interface GenericDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  emptyState?: React.ReactNode;
}
```

**Responsibility:** Reusable table with shadcn/ui Table.

---

### `ui/src/components/page-header.tsx` [NEW]

**Props:**
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}
```

---

### `ui/src/components/thing-card-row.tsx` [NEW]

**Props:**
```typescript
interface ThingCardRowProps {
  thing: ThingCardOutput;
}
```

**Responsibility:** Render thing row with all ThingCard fields visible.

---

## UI Route Files

### `ui/src/routes/_layout/types.tsx` [NEW]

**Route:** `/types`

**Loader:**
```typescript
loader: async () => {
  await queryClient.ensureQueryData(typesListQueryOptions());
},
```

**Features:**
- Table of types
- Columns: key, label, pluginKey, enabled, capabilities
- Click row to go to type detail

---

### `ui/src/routes/_layout/types.$typeKey.tsx` [NEW]

**Route:** `/types/$typeKey`

**Loader:**
```typescript
loader: async ({ params }) => {
  await queryClient.ensureQueryData(typeDetailQueryOptions(params.typeKey));
  await queryClient.ensureQueryData(
    thingsListQueryOptions(
      { typeKeys: [params.typeKey] },
      { limit: 24 }
    )
  );
},
```

**Features:**
- All type fields
- Schema blocks (jsonSchema, uiSchema, searchConfig)
- Related things list
- Raw JSON inspector

---

### `ui/src/routes/_layout/_authenticated/workspaces.tsx` [NEW]

**Route:** `/workspaces`

**Loader:**
```typescript
loader: async ({ location }) => {
  const search = workspaceListSearchSchema.parse(location.search);
  await queryClient.ensureQueryData(
    workspacesListMineQueryOptions(
      { cursor: search.cursor, limit: search.limit },
      search.q
    )
  );
},
validateSearch: (search) => workspaceListSearchSchema.parse(search),
```

**Features:**
- Workspace list table
- Search input (q)
- Pagination
- Create workspace link

---

### `ui/src/routes/_layout/_authenticated/workspaces.$workspaceId.tsx` [NEW]

**Route:** `/workspaces/$workspaceId`

**Loader:**
```typescript
loader: async ({ params }) => {
  await queryClient.ensureQueryData(workspaceDetailQueryOptions(params.workspaceId));
  await queryClient.ensureQueryData(
    workspaceThingsQueryOptions(params.workspaceId, {}, { limit: 10 })
  );
},
```

**Features:**
- All workspace fields rendered
- Permission panel
- Links to:
  - Things in workspace
  - Views in workspace
  - Grants page
  - Create thing
- Raw JSON inspector

---

### `ui/src/routes/_layout/_authenticated/workspaces.$workspaceId.things.tsx` [NEW]

**Route:** `/workspaces/$workspaceId/things`

**Loader:**
```typescript
loader: async ({ params, location }) => {
  const search = workspaceThingSearchSchema.parse(location.search);
  await queryClient.ensureQueryData(
    workspaceThingsQueryOptions(params.workspaceId, search, { limit: search.limit || 24, cursor: search.cursor })
  );
},
validateSearch: (search) => workspaceThingSearchSchema.parse(search),
```

**Features:**
- Filter toolbar (q, typeKeys, status, visibility, sort)
- Search params in URL
- ThingCardRow list
- Create thing link
- Spawn random thing button (skeleton for now)

---

### `ui/src/routes/_layout/_authenticated/workspaces.$workspaceId.things.new.tsx` [NEW]

**Route:** `/workspaces/$workspaceId/things/new`

**Features:**
- Form fields:
  - typeKey picker (from types.list)
  - slug
  - title
  - summary
  - visibility
  - attrs JSON editor
  - content JSON editor
- Schema-aware assist if type.jsonSchema exists
- Submit creates thing
- Navigate to thing detail on success

---

### `ui/src/routes/_layout/things.$thingId.tsx` [NEW]

**Route:** `/things/$thingId`

**Loader:**
```typescript
loader: async ({ params }) => {
  await queryClient.ensureQueryData(thingDetailQueryOptions(params.thingId));
},
```

**Features:**
**Header Section:**
- id, workspaceId (link), typeKey (link), slug, title, summary
- status badge, visibility badge
- createdByUserId, createdAt, updatedAt, publishedAt
- permissions panel

**Content Section:**
- attrs JSON block
- content JSON block

**Publications Section (if any):**
- Table of publications
- Columns: spaceId, slug, status, featuredRank, publishedByUserId, publishedAt
- Links to spaces
- Link to local public route `/s/$spaceKey/$slug` if resolvable

**Relations Section (if any):**
- Table of edges
- Columns: id, fromThingId, relation, toThingId, attrs, createdByUserId, createdAt
- Clickable thing IDs

**Assets Section (skeleton for now):**
- List attached assets
- Attach/Detach buttons (disabled until asset flow done)

**Actions:**
- Edit link (to `/things/$thingId/edit`)
- Publish link (to `/things/$thingId/publish`)
- Assets link (to `/things/$thingId/assets`)
- Archive button (if permitted)

**Raw JSON:**
- Collapsible full thing JSON

---

### `ui/src/routes/_layout/_authenticated/things.$thingId.edit.tsx` [NEW]

**Route:** `/things/$thingId/edit`

**Features:**
- Edit form with:
  - slug
  - title
  - summary
  - status dropdown
  - visibility dropdown
  - attrs JSON editor
  - content JSON editor
- Schema-aware assist from type
- Save button
- Cancel returns to detail

---

### `ui/src/routes/_layout/_authenticated/workspaces.$workspaceId.grants.tsx` [NEW]

**Route:** `/workspaces/$workspaceId/grants`

**Loader:**
```typescript
loader: async ({ params }) => {
  await queryClient.ensureQueryData(workspaceGrantsQueryOptions(params.workspaceId));
},
```

**Features:**
- Grants table
- Columns: principalType, principalId, role, createdByUserId, createdAt
- Add grant form:
  - Principal type picker
  - Principal ID input
  - Role picker
- Remove grant button per row

---

## UI Layout Updates

### `ui/src/routes/_layout.tsx` [MODIFY]

Update nav to:
```
Home | Search | Types | Spaces | Workspaces | Views | Activity | Generator | Me
```

Remove theme-dependent styling, simplify to minimal.

---

### `ui/src/styles.css` [MODIFY]

Simplify to minimal black/white system:
- White background
- Black text
- Black borders
- No gradients, no shadows, no theme colors
- Monospace for IDs, slugs, code

---

## Testing

### API Tests
- `api/tests/integration/types.test.ts`
- `api/tests/integration/workspaces.test.ts`
- `api/tests/integration/things.test.ts`

### UI Tests
- Component tests for generic inspector pieces
- Route smoke tests

---

## Sequencing Constraints

**Must complete from Milestone 1:**
- Principal resolution
- `identity.me`
- Basic permission checking

**Must complete before Milestone 3:**
- All workspace/things browse flows working
- Generic inspector pattern proven
- Create forms working

---

## References

- `/reference/orpc-contracts.md` - Contract patterns
- `/reference/generic-inspector.md` - Inspector component patterns
- `/reference/search-url-patterns.md` - URL search param handling
