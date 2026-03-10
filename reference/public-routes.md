# Public Routes and Space Resolution

Reference for host-based and local-dev public space routing.

## Production: Host-Based Resolution

In production, the host server resolves spaces by the incoming request hostname.

### Host Resolution Flow

```
Request: GET https://chicago.everything.dev/s/eth-chicago-2026
Host header: "chicago.everything.dev"

1. Host queries API: spaces.getByHost("chicago.everything.dev")
2. If space found, treat as current space context
3. Resolve "eth-chicago-2026" as publication slug in that space
4. Render thing detail with space context
```

### Implementation in Host

```typescript
// host/src/program.ts
app.get("/s/:slug", async (c) => {
  const host = c.req.header("host");
  const slug = c.req.param("slug");

  if (!host || host === config.hostUrl) {
    // Not a custom host, proceed normally
    return c.json({ error: "Not found" }, 404);
  }

  // Resolve space by host
  const space = await spaceService.getByHost(host);

  if (!space) {
    return c.json({ error: "Space not found" }, 404);
  }

  // Resolve publication by slug in space
  const publication = await publicationService.getBySlug(space.id, slug);

  if (!publication) {
    return c.json({ error: "Publication not found" }, 404);
  }

  // Fetch thing detail
  const thing = await thingService.get(publication.thingId);

  // Render with SSR including space context
  return renderThingPage(c, thing, { space, publication });
});
```

### DNS Requirements

For host-based routing to work:

1. Wildcard DNS: `*.everything.dev` → host IP
2. Or explicit records per space:
   - `chicago.everything.dev` → host IP
   - `ethglobal.everything.dev` → host IP

## Local Dev: Path-Based Resolution

For local development without custom domains, use path-based routing.

### Local Route Pattern

```
GET /s/{spaceKey}/{slug}

Example:
GET /s/chicago/eth-chicago-2026
```

### Implementation

```typescript
// host/src/program.ts (or handled by UI router)
app.get("/s/:spaceKey/:slug", async (c) => {
  const spaceKey = c.req.param("spaceKey");
  const slug = c.req.param("slug");

  // Resolve space by key
  const space = await spaceService.getByKey(spaceKey);

  if (!space) {
    return c.json({ error: "Space not found" }, 404);
  }

  // Resolve publication
  const publication = await publicationService.getBySlug(space.id, slug);

  if (!publication) {
    return c.json({ error: "Publication not found" }, 404);
  }

  // Fetch thing
  const thing = await thingService.get(publication.thingId);

  return renderThingPage(c, thing, { space, publication });
});
```

### UI Route Definition

```typescript
// ui/src/routes/_layout/s.$spaceKey.$slug.tsx
export const Route = createFileRoute("/_layout/s/$spaceKey/$slug")({
  loader: async ({ params }) => {
    // 1. Resolve space
    const space = await queryClient.ensureQueryData(
      spaceByKeyQueryOptions(params.spaceKey)
    );

    // 2. Resolve publication by space+slug
    const publication = await queryClient.ensureQueryData(
      publicationBySlugQueryOptions(space.id, params.slug)
    );

    // 3. Fetch thing
    const thing = await queryClient.ensureQueryData(
      thingDetailQueryOptions(publication.thingId)
    );

    return { space, publication, thing };
  },
  component: PublicPublicationPage,
});

function PublicPublicationPage() {
  const { space, publication, thing } = Route.useLoaderData();

  return (
    <div className="public-page">
      {/* Prominently show context */}
      <div className="context-banner">
        <span>Space: {space.title}</span>
        <span>Publication: {publication.slug}</span>
        <span>Thing ID: <code>{thing.id}</code></span>
      </div>

      {/* Same inspector as /things/$thingId */}
      <ThingDetail thing={thing} context={{ space, publication }} />
    </div>
  );
}
```

## Space Key vs Host

### Space Key

- Human-readable identifier: `chicago`, `ethglobal`, `nyc`
- Unique across all spaces
- Used in local-dev URLs: `/s/chicago/slug`
- Can be used in API lookups: `spaces.getByKey("chicago")`

### Space Host

- Full domain: `chicago.everything.dev`
- Also unique
- Used in production routing
- API lookup: `spaces.getByKey("chicago.everything.dev")`

### Relationship

```typescript
interface Space {
  id: string;
  key: string;           // "chicago"
  host: string;          // "chicago.everything.dev"
  // ...
}

// Both resolve to same space:
getByKey("chicago") === getByHost("chicago.everything.dev")
```

## Public Page Layout

Public pages should show:

1. **Space context prominently**
   - Space title, description
   - Link to space detail page

2. **Publication context**
   - Publication slug
   - Publication status
   - Featured rank (if applicable)

3. **Underlying thing ID**
   - For transparency/debugging
   - Link to generic thing page

4. **Same inspector as internal**
   - All thing fields
   - Publications list
   - Relations
   - Assets
   - Raw JSON

5. **Plugin rendering (if applicable)**
   - Type-specific renderer
   - Space-specific renderer
   - Fallback to generic

## Permission Handling

Public routes have special permission logic:

```typescript
function checkPublicReadPermission(
  space: Space,
  publication: Publication,
  thing: Thing
): boolean {
  // Space must be public or unlisted
  if (space.visibility === "private") {
    return false;
  }

  // Publication must be live
  if (publication.status !== "live") {
    return false;
  }

  // Thing must allow public read
  if (thing.visibility === "private") {
    // Can still be public via publication override
    return true; // Publication makes it public
  }

  return true;
}
```

## Open Graph / Meta Tags

Public pages need proper SEO:

```typescript
head: ({ loaderData }) => {
  const { space, thing, publication } = loaderData;

  return {
    meta: [
      { title: `${thing.title} | ${space.title}` },
      { name: "description", content: thing.summary ?? space.description },
      { property: "og:title", content: thing.title },
      { property: "og:description", content: thing.summary },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `https://${space.host}/s/${publication.slug}` },
      // Generate OG image if thing has featured asset
      ...(thing.featuredAsset ? [
        { property: "og:image", content: thing.featuredAsset.url },
      ] : []),
    ],
  };
},
```

## Related Files

- `host/src/program.ts` - Host routing
- `ui/src/routes/_layout/s.$spaceKey.$slug.tsx` - Public page
- `api/src/services/spaces.ts` - Space resolution
- `api/src/services/publications.ts` - Publication lookup
