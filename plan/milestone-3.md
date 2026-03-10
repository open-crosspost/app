# Milestone 3: Spaces, Publications, Grants, and Public Routes

**Goal:** Complete the publication layer with spaces, public routes, and full grant management. Add multi-step workflows for publishing and graph generation.

**Phase:** Publication and workflow layer. This makes the app publicly navigable and adds the advanced flows.

---

## Exit Criteria

- [ ] Spaces with host-based and local-dev routing
- [ ] Publish/unpublish workflows with Effect orchestration
- [ ] Public publication route `/s/$spaceKey/$slug`
- [ ] Graph generator with Effect workflow
- [ ] Full grant management for spaces
- [ ] All detail pages cross-linked

---

## API Schema Files

### `api/src/db/schema/spaces.ts` [NEW]

```typescript
export const spaces = sqliteTable("spaces", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  host: text("host").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  visibility: text("visibility").notNull().default("public"), // "private" | "unlisted" | "public"
  kind: text("kind").notNull().default("public"),
  pluginKey: text("plugin_key"),
  theme: text("theme").notNull().default("{}"), // JSON
  attrs: text("attrs").notNull().default("{}"), // JSON
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const spaceGrants = sqliteTable("space_grants", {
  spaceId: text("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  principalType: text("principal_type").notNull(),
  principalId: text("principal_id").notNull(),
  role: text("role").notNull().default("viewer"),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.spaceId, table.principalType, table.principalId] }),
}));
```

**Indexes:**
- `spaces.key` unique
- `spaces.host` unique
- `space_grants` composite unique

---

### `api/src/db/schema/publications.ts` [NEW]

```typescript
export const publications = sqliteTable("publications", {
  id: text("id").primaryKey(),
  thingId: text("thing_id").notNull().references(() => things.id, { onDelete: "cascade" }),
  spaceId: text("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  status: text("status").notNull().default("live"), // "live" | "hidden" | "removed"
  featuredRank: integer("featured_rank"),
  attrs: text("attrs").notNull().default("{}"), // JSON
  publishedByUserId: text("published_by_user_id").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  thingSpaceUnique: uniqueIndex("publications_thing_space_unique").on(table.thingId, table.spaceId),
  spaceSlugUnique: uniqueIndex("publications_space_slug_unique").on(table.spaceId, table.slug),
}));
```

**Indexes:**
- `publications(thing_id, space_id)` unique
- `publications(space_id, slug)` unique

---

### `api/src/db/schema/edges.ts` [NEW]

```typescript
export const edges = sqliteTable("edges", {
  id: text("id").primaryKey(),
  fromThingId: text("from_thing_id").notNull().references(() => things.id, { onDelete: "cascade" }),
  relation: text("relation").notNull(),
  toThingId: text("to_thing_id").notNull().references(() => things.id, { onDelete: "cascade" }),
  attrs: text("attrs").notNull().default("{}"), // JSON
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  relationUnique: uniqueIndex("edges_relation_unique").on(table.fromThingId, table.relation, table.toThingId),
}));
```

**Indexes:**
- `edges(from_thing_id, relation, to_thing_id)` unique

---

### `api/src/db/schema/assets.ts` [NEW]

```typescript
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "image" | "video" | "audio" | "file"
  storageKey: text("storage_key").notNull().unique(),
  mimeType: text("mime_type"),
  bytes: integer("bytes"),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  altText: text("alt_text"),
  metadata: text("metadata").notNull().default("{}"), // JSON
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const thingAssets = sqliteTable("thing_assets", {
  id: text("id").primaryKey(),
  thingId: text("thing_id").notNull().references(() => things.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  position: integer("position").notNull().default(0),
  attrs: text("attrs").notNull().default("{}"), // JSON
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  thingAssetRoleUnique: uniqueIndex("thing_assets_unique").on(table.thingId, table.assetId, table.role),
}));
```

**Indexes:**
- `assets.storage_key` unique
- `thing_assets(thing_id, asset_id, role)` unique

---

### `api/src/db/schema/views.ts` [NEW]

```typescript
export const views = sqliteTable("views", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  spaceId: text("space_id").references(() => spaces.id, { onDelete: "cascade" }),
  slug: text("slug"),
  title: text("title").notNull(),
  description: text("description"),
  layout: text("layout").notNull().default("feed"), // "feed" | "grid" | "table" | "graph"
  query: text("query").notNull().default("{}"), // JSON (ThingFilter)
  visibility: text("visibility").notNull().default("private"),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

**Indexes:**
- `views.workspace_id` + `slug` unique (if slug not null)
- `views.space_id` + `slug` unique (if slug not null)

---

### `api/src/db/schema/activity.ts` [NEW]

```typescript
export const activity = sqliteTable("activity", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  verb: text("verb").notNull(),
  objectThingId: text("object_thing_id").references(() => things.id, { onDelete: "set null" }),
  targetThingId: text("target_thing_id").references(() => things.id, { onDelete: "set null" }),
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  spaceId: text("space_id").references(() => spaces.id, { onDelete: "cascade" }),
  payload: text("payload").notNull().default("{}"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

**Indexes:**
- `activity.workspace_id` + `created_at`
- `activity.space_id` + `created_at`
- `activity.actor_user_id` + `created_at`

---

## API Migration

### `api/src/db/migrations/0002_spaces_publications.sql` [NEW]

Add space, publication, edge, asset, view, activity tables.

---

## API Services

### `api/src/services/spaces.ts` [NEW]

```typescript
export const SpacesService = {
  list: async (db: Database, pagination: PageInput, q?: string) => {
    // List all public spaces + spaces with grants
  },
  get: async (db: Database, id: string, principalSet: PrincipalSet) => {
    // Return space with permissions
  },
  getByHost: async (db: Database, host: string, principalSet: PrincipalSet) => {
    // Return space by host (for production routing)
  },
  getByKey: async (db: Database, key: string, principalSet: PrincipalSet) => {
    // Return space by key (for local-dev routing)
  },
  create: async (db: Database, input: SpaceCreateInput, userId: string) => {
    // Create space with owner grant
  },
  update: async (db: Database, id: string, input: SpaceUpdateInput, principalSet: PrincipalSet) => {
    // Update space (check edit permission)
  },
  listGrants: async (db: Database, spaceId: string, principalSet: PrincipalSet) => {
    // List grants (check manageGrants)
  },
  upsertGrant: async (db: Database, spaceId: string, principal: PrincipalRef, role: ResourceRole, createdByUserId: string) => {
    // Upsert grant
  },
  removeGrant: async (db: Database, spaceId: string, principal: PrincipalRef) => {
    // Remove grant
  },
  browseThings: async (db: Database, spaceId: string, filter: ThingFilter, pagination: PageInput) => {
    // List published things in space
  },
};
```

---

### `api/src/services/publications.ts` [NEW]

```typescript
export const PublicationsService = {
  publish: async (
    db: Database,
    thingId: string,
    targets: Array<{ spaceId: string; slug: string; featuredRank?: number; attrs?: object }>,
    userId: string,
    principalSet: PrincipalSet
  ) => {
    // Multi-target publish
    // Check thing edit permission + space publish permission per target
    // Create/update publications
  },
  unpublish: async (db: Database, thingId: string, spaceId: string, principalSet: PrincipalSet) => {
    // Remove publication
  },
};
```

---

### `api/src/services/edges.ts` [NEW]

```typescript
export const EdgesService = {
  listForThing: async (db: Database, thingId: string, relation?: string) => {
    // List edges from/to thing
  },
  upsert: async (
    db: Database,
    fromThingId: string,
    relation: string,
    toThingId: string,
    attrs: object,
    userId: string,
    principalSet: PrincipalSet
  ) => {
    // Upsert edge (check both things editable)
  },
  remove: async (
    db: Database,
    fromThingId: string,
    relation: string,
    toThingId: string,
    principalSet: PrincipalSet
  ) => {
    // Remove edge
  },
};
```

---

### `api/src/services/assets.ts` [NEW]

```typescript
export const AssetsService = {
  createUpload: async (
    db: Database,
    workspaceId: string,
    fileName: string,
    mimeType: string,
    bytes: number,
    kind: string,
    userId: string,
    principalSet: PrincipalSet
  ) => {
    // Create asset record
    // Generate upload URL (presigned S3/R2)
    // Return assetId, uploadUrl, storageKey
  },
  completeUpload: async (
    db: Database,
    assetId: string,
    storageKey: string,
    metadata: AssetMetadataInput,
    userId: string
  ) => {
    // Update asset with actual metadata
  },
  attachToThing: async (
    db: Database,
    thingId: string,
    assetId: string,
    role: string,
    position: number,
    attrs: object,
    userId: string,
    principalSet: PrincipalSet
  ) => {
    // Create thing_assets link
  },
  detachFromThing: async (
    db: Database,
    thingId: string,
    assetId: string,
    role: string,
    principalSet: PrincipalSet
  ) => {
    // Remove thing_assets link
  },
};
```

---

### `api/src/services/views.ts` [NEW]

```typescript
export const ViewsService = {
  list: async (db: Database, options: { workspaceId?: string; spaceId?: string; pagination: PageInput }, principalSet: PrincipalSet) => {
    // List views scoped to workspace or space
  },
  get: async (db: Database, id: string, principalSet: PrincipalSet) => {
    // Return view with permissions
  },
  execute: async (db: Database, viewId: string, principalSet: PrincipalSet) => {
    // Parse view.query (ThingFilter)
    // Execute search
    // Return results
  },
};
```

---

### `api/src/services/activity.ts` [NEW]

```typescript
export const ActivityService = {
  list: async (
    db: Database,
    options: {
      workspaceId?: string;
      spaceId?: string;
      actorUserId?: string;
      thingId?: string;
      pagination: PageInput;
    }
  ) => {
    // List activity events with filters
  },
};
```

---

### `api/src/services/search.ts` [NEW]

```typescript
export const SearchService = {
  searchThings: async (
    db: Database,
    filter: ThingFilter,
    pagination: PageInput,
    principalSet: PrincipalSet
  ) => {
    // Composed search across things with visibility + grants
  },
};
```

---

## API Contract Updates

### `api/src/contract.ts` [MODIFY]

Add routes:

```typescript
// Spaces
"spaces.list": oc.route(...).input(PageInput.extend({ q: z.string().optional() })),
"spaces.get": oc.route(...).input({ id: UUID }).output(Space),
"spaces.getByHost": oc.route(...).input({ host: z.string() }).output(Space),
"spaces.create": oc.route(...).input(SpaceCreateInput).output(Space),
"spaces.update": oc.route(...).input(SpaceUpdateInput).output(Space),
"spaces.grants.list": oc.route(...).input({ spaceId: UUID }).output(z.array(Grant)),
"spaces.grants.upsert": oc.route(...).input(GrantUpsertInput).output(Grant),
"spaces.grants.remove": oc.route(...).input(GrantRemoveInput).output(z.object({ ok: z.boolean() })),
"spaces.browseThings": oc.route(...).input(PageInput.extend({ spaceId: UUID, filter: ThingFilter })),

// Publications
"publications.publish": oc.route(...).input({
  thingId: UUID,
  targets: z.array(z.object({
    spaceId: UUID,
    slug: z.string(),
    featuredRank: z.number().int().optional(),
    attrs: Json.optional(),
  })),
}).output(z.array(PublicationOutput)),
"publications.unpublish": oc.route(...).input({ thingId: UUID, spaceId: UUID }).output(z.object({ ok: z.boolean() })),

// Edges
"edges.listForThing": oc.route(...).input({ thingId: UUID, relation: z.string().optional() }).output(z.array(Edge)),
"edges.upsert": oc.route(...).input({
  fromThingId: UUID,
  relation: z.string(),
  toThingId: UUID,
  attrs: Json.optional(),
}).output(Edge),
"edges.remove": oc.route(...).input({
  fromThingId: UUID,
  relation: z.string(),
  toThingId: UUID,
}).output(z.object({ ok: z.boolean() })),

// Assets
"assets.createUpload": oc.route(...).input({
  workspaceId: UUID,
  fileName: z.string(),
  mimeType: z.string(),
  bytes: z.number().int().positive(),
  kind: z.enum(["image", "video", "audio", "file"]),
}).output(z.object({ assetId: UUID, uploadUrl: z.string(), storageKey: z.string() })),
"assets.completeUpload": oc.route(...).input(AssetCompleteInput).output(z.object({ id: UUID })),
"assets.attachToThing": oc.route(...).input({
  thingId: UUID,
  assetId: UUID,
  role: z.string(),
  position: z.number().int().optional(),
  attrs: Json.optional(),
}).output(z.object({ ok: z.boolean() })),
"assets.detachFromThing": oc.route(...).input({
  thingId: UUID,
  assetId: UUID,
  role: z.string(),
}).output(z.object({ ok: z.boolean() })),

// Views
"views.list": oc.route(...).input(PageInput.extend({
  workspaceId: UUID.optional(),
  spaceId: UUID.optional(),
})).output(z.object({ items: z.array(View), nextCursor: z.string().nullish() })),
"views.get": oc.route(...).input({ id: UUID }).output(View),
"views.execute": oc.route(...).input({ id: UUID }).output(z.object({
  view: View,
  results: z.array(ThingCard),
  nextCursor: z.string().nullish(),
})),

// Activity
"activity.list": oc.route(...).input(PageInput.extend({
  workspaceId: UUID.optional(),
  spaceId: UUID.optional(),
  actorUserId: z.string().optional(),
  thingId: UUID.optional(),
})).output(z.object({ items: z.array(ActivityEvent), nextCursor: z.string().nullish() })),

// Search
"search.things": oc.route(...).input(PageInput.extend({ filter: ThingFilter })).output(z.object({
  items: z.array(ThingCard),
  nextCursor: z.string().nullish(),
})),
```

---

## UI Query Factories

### `ui/src/lib/queries/spaces.ts` [NEW]

```typescript
export const spacesListQueryOptions = (pagination: PageInput, q?: string) =>
  queryOptions({
    queryKey: ["spaces", "list", pagination, q],
    queryFn: () => apiClient["spaces.list"]({ ...pagination, q }),
  });

export const spaceDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["spaces", "detail", id],
    queryFn: () => apiClient["spaces.get"]({ id }),
  });

export const spaceByHostQueryOptions = (host: string) =>
  queryOptions({
    queryKey: ["spaces", "byHost", host],
    queryFn: () => apiClient["spaces.getByHost"]({ host }),
  });

export const spaceByKeyQueryOptions = (key: string) =>
  queryOptions({
    queryKey: ["spaces", "byKey", key],
    queryFn: () => apiClient["spaces.getByKey"]({ key }),
  });

export const spaceGrantsQueryOptions = (spaceId: string) =>
  queryOptions({
    queryKey: ["spaces", "grants", spaceId],
    queryFn: () => apiClient["spaces.grants.list"]({ spaceId }),
  });

export const spaceThingsQueryOptions = (spaceId: string, filter: ThingFilter, pagination: PageInput) =>
  queryOptions({
    queryKey: ["spaces", "things", spaceId, filter, pagination],
    queryFn: () => apiClient["spaces.browseThings"]({ spaceId, filter, ...pagination }),
  });
```

---

### `ui/src/lib/queries/views.ts` [NEW]

```typescript
export const viewsListQueryOptions = (options: { workspaceId?: string; spaceId?: string; pagination: PageInput }) =>
  queryOptions({
    queryKey: ["views", "list", options],
    queryFn: () => apiClient["views.list"](options),
  });

export const viewDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["views", "detail", id],
    queryFn: () => apiClient["views.get"]({ id }),
  });

export const viewResultsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["views", "results", id],
    queryFn: () => apiClient["views.execute"]({ id }),
  });
```

---

### `ui/src/lib/queries/activity.ts` [NEW]

```typescript
export const activityListQueryOptions = (options: {
  workspaceId?: string;
  spaceId?: string;
  actorUserId?: string;
  thingId?: string;
  pagination: PageInput;
}) =>
  queryOptions({
    queryKey: ["activity", "list", options],
    queryFn: () => apiClient["activity.list"](options),
  });
```

---

## Effect Workflow Files

### `ui/src/features/publish/use-publish-flow.ts` [NEW]

**Responsibility:** Orchestrate multi-target publish with Effect.

```typescript
import { Effect } from "effect";

interface PublishState {
  targets: Array<{ spaceId: string; slug: string; featuredRank?: number }>;
  progress: Array<{ spaceId: string; status: "pending" | "success" | "error"; error?: string }>;
}

export function usePublishFlow() {
  const [state, setState] = useState<PublishState>({ targets: [], progress: [] });
  
  const publish = async (thingId: string, targets: PublishState["targets"]) => {
    const program = Effect.gen(function* () {
      // Stage 1: Validate permissions per target
      // Stage 2: Publish each target
      // Stage 3: Handle partial failures
      // Return aggregate result
    });
    
    const result = await Effect.runPromise(program);
    return result;
  };
  
  return { state, publish };
}
```

---

### `ui/src/features/assets/use-upload-flow.ts` [NEW]

**Responsibility:** Upload orchestration with progress.

```typescript
export function useUploadFlow() {
  const upload = async ({
    file,
    workspaceId,
    thingId,
    role,
  }: {
    file: File;
    workspaceId: string;
    thingId?: string;
    role?: string;
  }) => {
    const program = Effect.gen(function* () {
      // 1. Create upload intent
      // 2. Upload to presigned URL with progress tracking
      // 3. Complete upload
      // 4. Optional: attach to thing
      // Return asset info
    });
    
    return await Effect.runPromise(program);
  };
  
  return { upload, progress };
}
```

---

### `ui/src/features/generator/random.ts` [NEW]

**Responsibility:** Random payload generators.

```typescript
export function generateRandomThing(typeKey: string, options?: {
  workspaceId?: string;
  connectToThingIds?: string[];
}): ThingCreateInput;

export function generateRandomEdge(fromThingId: string): EdgeCreateInput;

export function randomSlug(prefix?: string): string;
export function randomTitle(): string;
export function randomSummary(): string;
export function randomAttrs(schema?: object): object;
```

---

### `ui/src/features/generator/seeding.ts` [NEW]

**Responsibility:** Graph seeding program.

```typescript
export interface SeedConfig {
  workspaceId: string;
  count: number;
  typeKey?: string;
  connectDensity: number; // 0-1 probability of creating edges
  publishToSpaces?: string[];
  attachAssets?: boolean;
}

export function createSeedProgram(config: SeedConfig): Effect.Effect<
  {
    createdThingIds: string[];
    createdEdgeIds: string[];
    publishedCount: number;
  },
  SeedError,
  ApiClientService
>;
```

---

### `ui/src/features/generator/use-generator-flow.ts` [NEW]

**Responsibility:** UI-facing generator workflow.

```typescript
export function useGeneratorFlow() {
  const [log, setLog] = useState<string[]>([]);
  
  const seed = async (config: SeedConfig) => {
    const program = createSeedProgram(config).pipe(
      Effect.tap((result) => Effect.sync(() => {
        setLog((prev) => [...prev, `Created ${result.createdThingIds.length} things`]);
      })),
      Effect.catchAll((error) => Effect.sync(() => {
        setLog((prev) => [...prev, `Error: ${error.message}`]);
        return { createdThingIds: [], createdEdgeIds: [], publishedCount: 0 };
      }))
    );
    
    return await Effect.runPromise(program);
  };
  
  const spawnOne = async (workspaceId: string, typeKey?: string) => {
    // Single thing creation
  };
  
  return { seed, spawnOne, log };
}
```

---

## UI Route Files

### `ui/src/routes/_layout/spaces.tsx` [NEW]

**Route:** `/spaces`

**Features:**
- Spaces list table
- Search (q)
- Public vs private visibility
- Create space link

---

### `ui/src/routes/_layout/spaces.$spaceId.tsx` [NEW]

**Route:** `/spaces/$spaceId`

**Features:**
- All space fields
- Host/key display prominently
- Published things list
- Views in space
- Grants management link
- Plugin slot (if type renderer exists)
- Raw JSON inspector

---

### `ui/src/routes/_layout/spaces.new.tsx` [NEW]

**Route:** `/spaces/new`

**Features:**
- Create space form
- Fields: key, host, title, description, visibility, kind, pluginKey, theme JSON, attrs JSON
- Owner principal picker (from current principals)

---

### `ui/src/routes/_layout/spaces.$spaceId.things.tsx` [NEW]

**Route:** `/spaces/$spaceId/things`

**Features:**
- Browse published things in space
- Same filter toolbar pattern as workspace things
- ThingCardRow list

---

### `ui/src/routes/_layout/spaces.$spaceId.views.tsx` [NEW]

**Route:** `/spaces/$spaceId/views`

**Features:**
- Views scoped to space
- Links to each view detail

---

### `ui/src/routes/_layout/_authenticated/spaces.$spaceId.grants.tsx` [NEW]

**Route:** `/spaces/$spaceId/grants`

**Features:**
- Space grants table
- Add/remove grants
- Same pattern as workspace grants

---

### `ui/src/routes/_layout/views.tsx` [NEW]

**Route:** `/views`

**Features:**
- All accessible views list
- Filter by workspace or space

---

### `ui/src/routes/_layout/views.$viewId.tsx` [NEW]

**Route:** `/views/$viewId`

**Features:**
- View detail: all fields including query JSON
- Execute query button
- Results rendered as things list
- Proves views are saved queries

---

### `ui/src/routes/_layout/activity.tsx` [NEW]

**Route:** `/activity`

**Features:**
- Activity feed table
- Filter by workspace, space, actor, thing
- Linked references to things/spaces/workspaces

---

### `ui/src/routes/_layout/s.$spaceKey.$slug.tsx` [NEW]

**Route:** `/s/$spaceKey/$slug`

**Responsibility:** Local-dev public publication route.

**Loader:**
```typescript
loader: async ({ params }) => {
  // 1. Resolve space by key
  const space = await queryClient.ensureQueryData(spaceByKeyQueryOptions(params.spaceKey));
  // 2. Fetch thing by publication
  const thing = await queryClient.ensureQueryData(
    thingByPublicationQueryOptions(params.spaceKey, params.slug)
  );
  return { space, thing };
},
```

**Features:**
- Prominently show: current space, publication slug, underlying thing id
- Same detail layout as `/things/$thingId`
- Publications section
- Relations section
- Assets section
- Raw JSON

---

### `ui/src/routes/_layout/_authenticated/things.$thingId.publish.tsx` [NEW]

**Route:** `/things/$thingId/publish`

**Features:**
- Current publications table
- Add publication form:
  - Space picker (from spaces.list)
  - Slug input
  - Featured rank (optional)
- Multi-target publish with progress
- Unpublish per space
- Uses `usePublishFlow` Effect hook

---

### `ui/src/routes/_layout/_authenticated/things.$thingId.assets.tsx` [NEW]

**Route:** `/things/$thingId/assets`

**Features:**
- Upload new asset:
  - File picker
  - Calls `assets.createUpload`
  - Uploads to returned URL
  - Calls `assets.completeUpload`
  - Attaches to thing
- Already attached assets list
- Detach button per asset
- Uses `useUploadFlow` Effect hook

---

### `ui/src/routes/_layout/_authenticated/assets.$assetId.tsx` [NEW]

**Route:** `/assets/$assetId` (if endpoint exists)

**Features:**
- All asset metadata fields
- Linked things using this asset (if data available)

---

### `ui/src/routes/_layout/_authenticated/generator.tsx` [NEW]

**Route:** `/generator`

**Features:**
- Workspace picker
- Type picker (optional)
- Target spaces picker (for auto-publish)
- Controls:
  - Count (1-50)
  - Relation density (0-1)
  - Attach random attrs/content toggle
  - Auto-publish toggle
  - Connect to existing toggle
- Actions:
  - Spawn one random thing
  - Seed N things
- Progress log display
- Created thing IDs with links

**Uses:** `useGeneratorFlow` with Effect orchestration

---

## Host Public Route Handling

### `host/src/program.ts` [MODIFY]

Add production host resolution:

```typescript
// In production, resolve space by host header
app.get("/", async (c) => {
  const host = c.req.header("host");
  if (host && host !== config.hostUrl) {
    // Try to resolve space by host
    const space = await spaceService.getByHost(host);
    if (space) {
      // Render space homepage or redirect to space detail
    }
  }
  // Default homepage
});
```

**Note:** For this milestone, local-dev route `/s/$spaceKey/$slug` is sufficient.
Production host-based resolution can be added later.

---

## Testing

### API Tests
- `api/tests/integration/spaces.test.ts`
- `api/tests/integration/publications.test.ts`
- `api/tests/integration/edges.test.ts`
- `api/tests/integration/assets.test.ts`
- `api/tests/integration/views.test.ts`
- `api/tests/integration/activity.test.ts`

### UI Tests
- Effect workflow tests (if Vitest supports Effect testing)
- Route smoke tests for publication flows

---

## Cleanup

### Remove Demo Routes

After all new routes work:
- `ui/src/routes/_layout/_authenticated/index.tsx` - Remove or repurpose
- `ui/src/routes/_layout/_authenticated/keys/index.tsx` - Remove
- `ui/src/routes/_layout/_authenticated/keys/$key.tsx` - Remove
- `api/src/services/kv.ts` - Remove

---

## Sequencing Constraints

**Must complete from Milestone 2:**
- Workspace/things browse working
- Generic inspector pattern established
- Query factories working

**Must complete before:**
- Generator needs all create/list/publish APIs
- Public route needs `spaces.getByHost` or `spaces.getByKey`

---

## References

- `/reference/effect-workflows.md` - Effect patterns for UI
- `/reference/public-routes.md` - Host-based resolution
- `/reference/asset-upload.md` - Upload flow patterns
