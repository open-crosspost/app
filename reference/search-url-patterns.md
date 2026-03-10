# Search and URL Param Patterns

Reference for URL search param handling and filter persistence.

## Philosophy

All filterable list views should have **URL-backed filters**:

1. **Shareable:** Copy/paste URL to share exact filter state
2. **Bookmarkable:** Save filtered views
3. **Back-button friendly:** Browser back/forward works
4. **SSR compatible:** Filters work on initial load

## Search Schema Pattern

### Base Pagination Schema

```typescript
export const pageInputSchema = z.object({
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(100).default(24),
});
```

### Thing Filter Schema (Global)

```typescript
export const thingListSearchSchema = z.object({
  q: z.string().optional(),
  typeKeys: z.array(z.string()).optional(),
  status: z.array(z.enum(["draft", "published", "archived"])).optional(),
  visibility: z.array(z.enum(["private", "unlisted", "public"])).optional(),
  relatedTo: z.array(z.object({
    relation: z.string(),
    thingIds: z.array(z.string().uuid()).min(1),
  })).optional(),
  sort: z.enum(["recent", "updated", "published", "trending"]).default("recent"),
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(100).default(24),
});
```

### Scoped Thing Filter (Workspace)

```typescript
export const workspaceThingSearchSchema = thingListSearchSchema.omit({
  // workspaceId comes from route params, not search
});
```

### View List Schema

```typescript
export const viewListSearchSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  spaceId: z.string().uuid().optional(),
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(100).default(24),
});
```

### Activity Schema

```typescript
export const activitySearchSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  spaceId: z.string().uuid().optional(),
  actorUserId: z.string().optional(),
  thingId: z.string().uuid().optional(),
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(100).default(50),
});
```

## Route Implementation

### TanStack Router Pattern

```typescript
// ui/src/routes/_layout/_authenticated/workspaces.$workspaceId.things.tsx
import { createFileRoute } from "@tanstack/react-router";
import { workspaceThingSearchSchema } from "@/lib/search-schemas";

export const Route = createFileRoute(
  "/_layout/_authenticated/workspaces/$workspaceId/things"
)({
  // Validate and parse search params
  validateSearch: (search: Record<string, unknown>) => {
    return workspaceThingSearchSchema.parse(search);
  },
  
  // Loader depends on parsed search + params
  loaderDeps: ({ params: { workspaceId }, search }) => ({
    workspaceId,
    filter: search,
  }),
  
  loader: async ({ deps, context }) => {
    await context.queryClient.ensureQueryData(
      workspaceThingsQueryOptions(
        deps.workspaceId,
        deps.filter,
        { cursor: deps.filter.cursor, limit: deps.filter.limit }
      )
    );
  },
  
  component: WorkspaceThingsPage,
});

function WorkspaceThingsPage() {
  const { workspaceId } = Route.useParams();
  const search = Route.useSearch(); // Already typed via validateSearch
  
  const { data } = useSuspenseQuery(
    workspaceThingsQueryOptions(workspaceId, search, { cursor: search.cursor, limit: search.limit })
  );
  
  return (
    <div>
      <SearchToolbar
        filters={search}
        onChange={(newFilters) => {
          // Navigate with new search params
          navigate({
            to: "/workspaces/$workspaceId/things",
            params: { workspaceId },
            search: newFilters,
          });
        }}
      />
      <ThingsList things={data.items} />
    </div>
  );
}
```

## Search Toolbar Component

```typescript
interface SearchToolbarProps<T extends z.ZodTypeAny> {
  filters: z.infer<T>;
  onChange: (filters: z.infer<T>) => void;
  schema: T;
}

function SearchToolbar({ filters, onChange, schema }: SearchToolbarProps<typeof thingListSearchSchema>) {
  return (
    <div className="search-toolbar">
      {/* Search query */}
      <Input
        value={filters.q ?? ""}
        onChange={(e) => onChange({ ...filters, q: e.target.value || undefined })}
        placeholder="Search..."
      />
      
      {/* Type filter */}
      <Select
        value={filters.typeKeys?.[0] ?? "all"}
        onValueChange={(val) => 
          onChange({ 
            ...filters, 
            typeKeys: val === "all" ? undefined : [val] 
          })
        }
      >
        <SelectItem value="all">All types</SelectItem>
        {/* Type options from types.list */}
      </Select>
      
      {/* Status filter */}
      <Select
        value={filters.status?.[0] ?? "all"}
        onValueChange={(val) =>
          onChange({
            ...filters,
            status: val === "all" ? undefined : [val as ThingStatus],
          })
        }
      >
        <SelectItem value="all">Any status</SelectItem>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="published">Published</SelectItem>
        <SelectItem value="archived">Archived</SelectItem>
      </Select>
      
      {/* Sort */}
      <Select
        value={filters.sort}
        onValueChange={(val) => onChange({ ...filters, sort: val })}
      >
        <SelectItem value="recent">Most recent</SelectItem>
        <SelectItem value="updated">Recently updated</SelectItem>
        <SelectItem value="published">Recently published</SelectItem>
        <SelectItem value="trending">Trending</SelectItem>
      </Select>
      
      {/* Clear filters */}
      <Button
        variant="outline"
        onClick={() => onChange({ limit: 24, sort: "recent" })}
      >
        Clear
      </Button>
      
      {/* Current filter display (for debugging) */}
      <QueryInspector filters={filters} />
    </div>
  );
}
```

## Query Inspector Component

Shows the current parsed search params for transparency:

```typescript
function QueryInspector({ filters }: { filters: unknown }) {
  return (
    <details className="query-inspector">
      <summary>Current filters</summary>
      <JsonBlock value={filters} />
    </details>
  );
}
```

## URL Serialization

### Array Handling

TanStack Router + zod handles arrays in URL automatically:

```
# Single value
?typeKeys=project

# Multiple values  
?typeKeys=project&typeKeys=person

# Complex objects (encoded as JSON)
?relatedTo=%5B%7B%22relation%22%3A%22built_for%22%2C%22thingIds%22%3A%5B%22abc%22%5D%7D%5D
```

### Cursor Pagination

```
# First page
/workspaces/123/things

# Next page (cursor from previous response)
/workspaces/123/things?cursor=eyJpZCI6IjEyMyJ9

# With filters
/workspaces/123/things?q=near&typeKeys=project&cursor=eyJpZCI6IjEyMyJ9
```

## Best Practices

1. **Default values in schema:** Use `.default()` in zod, not hardcoded fallbacks in UI.

2. **Optional vs nullable:** Use `.optional()` for absent fields, not null.

3. **Enum validation:** Always use zod enums for predefined values (status, visibility, sort).

4. **Debounce search:** Debounce the `q` input before updating URL to avoid rapid history entries.

5. **Preserve other params:** When changing one filter, spread existing filters to avoid clearing others.

6. **URL length limits:** Be cautious with complex `relatedTo` filters - may need POST for very complex queries.

7. **SSR hydration:** Ensure server-rendered HTML matches client hydration by using same validation logic.

## Filter Combinations

### Workspace Things
- Search: `q` (text match on title/summary)
- Type: `typeKeys[]`
- Status: `status[]`
- Visibility: `visibility[]`
- Sort: `sort`

### Space Things (Published)
- Search: `q`
- Type: `typeKeys[]`
- Status: from publication
- Featured: `featuredRank` sorting

### Global Search
- Search: `q` (matches title, summary, content)
- Type: `typeKeys[]`
- Workspace: `workspaceId`
- Space: `spaceId`
- Status: `status[]`
- Visibility: `visibility[]`
- Relations: `relatedTo[]`

### Activity Feed
- Workspace: `workspaceId`
- Space: `spaceId`
- Actor: `actorUserId`
- Thing: `thingId` (filter by object or target)

## Related Files

- `ui/src/lib/search-schemas.ts` - All search param schemas
- `ui/src/components/search-toolbar.tsx` - Filter UI component
- `ui/src/components/query-inspector.tsx` - Debug filter display
