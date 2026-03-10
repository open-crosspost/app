# Generic Inspector Pattern

Reference for the generic resource inspector UI pattern.

## Philosophy

The generic inspector is the **canonical fallback/debug view** that must always be present, even when plugin renderers exist. It ensures:

1. **Transparency:** Every field from the API is visible
2. **Debuggability:** Raw JSON inspection always available
3. **Consistency:** Same pattern across all resource types
4. **Fallback:** Works without any custom renderers

## Inspector Structure

Every detail page should follow this layout:

```
┌─────────────────────────────────────┐
│ Header                              │
│ - Title                             │
│ - Key metadata (id, slug, status)   │
│ - Permission panel                  │
│ - Action buttons                    │
├─────────────────────────────────────┤
│ Metadata Table                      │
│ - Scalar fields in rows             │
│ - Monospace for IDs/slugs/JSON    │
├─────────────────────────────────────┤
│ Plugin Slot (optional)              │
│ - Type-specific renderer if exists  │
│ - Falls back to generic if missing  │
├─────────────────────────────────────┤
│ Related Resources                   │
│ - Nested tables (publications,      │
│   relations, assets, etc.)          │
│ - Cross-links to related pages      │
├─────────────────────────────────────┤
│ Raw JSON                            │
│ - Collapsible full object           │
│ - Monospace pretty-print            │
└─────────────────────────────────────┘
```

## Component Hierarchy

### 1. Page Header

```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; variant?: string }>;
  actions?: React.ReactNode;
}
```

**Usage:**
```tsx
<PageHeader
  title={thing.title}
  subtitle={thing.slug}
  badges={[
    { label: thing.status, variant: "status" },
    { label: thing.visibility, variant: "visibility" },
  ]}
  actions={
    <>
      <Button asChild><Link to="/things/$thingId/edit">Edit</Link></Button>
      <Button variant="outline" onClick={handleArchive}>Archive</Button>
    </>
  }
/>
```

### 2. Resource Meta Table

```typescript
interface ResourceMetaTableProps {
  rows: Array<[string, React.ReactNode]>;
}
```

**Usage:**
```tsx
<ResourceMetaTable
  rows={[
    ["id", <code>{thing.id}</code>],
    ["typeKey", <Link to="/types/$typeKey">{thing.typeKey}</Link>],
    ["workspaceId", <Link to="/workspaces/$workspaceId">{thing.workspaceId}</Link>],
    ["slug", <code>{thing.slug}</code>],
    ["title", thing.title],
    ["summary", thing.summary ?? "—"],
    ["status", <Badge>{thing.status}</Badge>],
    ["visibility", <Badge>{thing.visibility}</Badge>],
    ["createdByUserId", <code>{thing.createdByUserId}</code>],
    ["createdAt", formatDate(thing.createdAt)],
    ["updatedAt", formatDate(thing.updatedAt)],
    ["publishedAt", thing.publishedAt ? formatDate(thing.publishedAt) : "—"],
  ]}
/>
```

**Style Rules:**
- Two columns: label + value
- Labels in muted text, right-aligned
- Values left-aligned
- IDs, slugs, JSON in monospace
- Dates formatted readable
- Null values as "—" (em dash)

### 3. Permission Panel

```typescript
interface PermissionPanelProps {
  permissions: PermissionSet;
}
```

**Usage:**
```tsx
<PermissionPanel permissions={thing.permissions} />
```

**Output:**
```
Role: editor
Read: ✓    Edit: ✓    Delete: ✗
Publish: ✓    Manage Grants: ✗
```

### 4. JSON Blocks

```typescript
interface JsonBlockProps {
  value: unknown;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}
```

**Usage:**
```tsx
<JsonBlock 
  title="attrs" 
  value={thing.attrs} 
  collapsible 
  defaultCollapsed 
/>

<JsonBlock 
  title="content" 
  value={thing.content} 
  collapsible 
  defaultCollapsed 
/>

<JsonBlock 
  title="Full Response" 
  value={thing} 
  collapsible
/>
```

**Style:**
- Monospace font
- Syntax highlighting (optional)
- Collapsible with chevron
- Scrollable if large

### 5. Related Tables

```typescript
// Generic data table for related resources
interface GenericDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  emptyState?: React.ReactNode;
}
```

**Examples:**

#### Publications Table
```tsx
<GenericDataTable
  data={thing.publications}
  columns={[
    { accessorKey: "spaceId", cell: (row) => <Link to={`/spaces/${row.spaceId}`}>{row.spaceId}</Link> },
    { accessorKey: "slug" },
    { accessorKey: "status", cell: (row) => <Badge>{row.status}</Badge> },
    { accessorKey: "featuredRank" },
    { accessorKey: "publishedByUserId", cell: (row) => <code>{row.publishedByUserId}</code> },
    { accessorKey: "publishedAt", cell: (row) => formatDate(row.publishedAt) },
  ]}
/>
```

#### Relations (Edges) Table
```tsx
<GenericDataTable
  data={thing.relations}
  columns={[
    { accessorKey: "id", cell: (row) => <code>{row.id}</code> },
    { accessorKey: "fromThingId", cell: (row) => <Link to={`/things/${row.fromThingId}`}>{row.fromThingId}</Link> },
    { accessorKey: "relation" },
    { accessorKey: "toThingId", cell: (row) => <Link to={`/things/${row.toThingId}`}>{row.toThingId}</Link> },
    { accessorKey: "attrs", cell: (row) => <JsonBlock value={row.attrs} collapsible defaultCollapsed /> },
    { accessorKey: "createdByUserId", cell: (row) => <code>{row.createdByUserId}</code> },
    { accessorKey: "createdAt", cell: (row) => formatDate(row.createdAt) },
  ]}
/>
```

#### Assets Table
```tsx
<GenericDataTable
  data={thing.assets}
  columns={[
    { accessorKey: "id", cell: (row) => <code>{row.id}</code> },
    { accessorKey: "role" },
    { accessorKey: "position" },
    { accessorKey: "asset.id", cell: (row) => <code>{row.asset.id}</code> },
    { accessorKey: "asset.kind", cell: (row) => <Badge>{row.asset.kind}</Badge> },
    { accessorKey: "asset.storageKey", cell: (row) => <code>{row.asset.storageKey}</code> },
    { accessorKey: "asset.mimeType" },
    { accessorKey: "asset.bytes", cell: (row) => formatBytes(row.asset.bytes) },
    { accessorKey: "asset.dimensions", cell: (row) => row.asset.width ? `${row.asset.width}x${row.asset.height}` : "—" },
    { accessorKey: "actions", cell: (row) => <Button onClick={() => detach(row.id)}>Detach</Button> },
  ]}
/>
```

### 6. Plugin Slot

```typescript
interface PluginSlotProps {
  pluginKey: string | null;
  resource: unknown;
  fallback: React.ReactNode;
}
```

**Usage:**
```tsx
<PluginSlot
  pluginKey={thing.type.pluginKey}
  resource={thing}
  fallback={
    <div className="plugin-fallback">
      <p>No custom renderer for type {thing.typeKey}</p>
      <p>Showing generic inspector below</p>
    </div>
  }
/>

{/* Always render generic inspector after plugin slot */}
<GenericThingInspector thing={thing} />
```

**Important:** The plugin slot is **additive**. Never hide the generic inspector when a plugin renderer exists.

## Visual Style

```css
/* Minimal black/white system */
.inspector {
  background: white;
  color: black;
  border: 1px solid black;
}

.inspector code,
.inspector pre {
  font-family: 'Red Hat Mono', monospace;
  font-size: 0.875rem;
}

.inspector table {
  border-collapse: collapse;
  width: 100%;
}

.inspector th,
.inspector td {
  border: 1px solid black;
  padding: 0.5rem;
  text-align: left;
}

.inspector .label {
  color: #666;
  text-align: right;
}

.inspector .json-block {
  background: #f5f5f5;
  padding: 1rem;
  border: 1px solid #ddd;
}
```

## Implementation Checklist

For every detail page:

- [ ] PageHeader with title and key metadata
- [ ] ResourceMetaTable with all scalar fields
- [ ] PermissionPanel showing computed permissions
- [ ] PluginSlot for type-specific rendering (if applicable)
- [ ] Related tables (publications, relations, assets)
- [ ] Cross-links to all related resources
- [ ] Raw JSON section (collapsible)
- [ ] Action buttons for edit/delete/etc.
- [ ] Empty states for empty relation tables
- [ ] Monospace formatting for IDs and JSON

## Related Files

- `ui/src/components/page-header.tsx`
- `ui/src/components/resource-meta-table.tsx`
- `ui/src/components/permission-panel.tsx`
- `ui/src/components/json-block.tsx`
- `ui/src/components/generic-data-table.tsx`
- `ui/src/components/plugin-slot.tsx`
