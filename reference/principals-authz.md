# Principals and Authorization Model

This reference defines the principal-based authorization model for the everything-dev application layer.

## Core Concept

**Better Auth owns:**
- User identity
- Sessions
- Organizations and memberships
- Teams and team memberships
- Invitations

**App Layer owns:**
- Workspaces
- Spaces
- Things
- Publications
- Edges
- Assets
- Views
- Activity
- Grants/permissions

**Principals bridge them:**

A principal is a reference to an entity that can have permissions:
- `user:{userId}` - An individual user
- `organization:{orgId}` - An organization (members inherit)
- `team:{teamId}` - A team within an organization (members inherit)

## Principal Format

```typescript
type PrincipalType = "user" | "organization" | "team";

interface PrincipalRef {
  type: PrincipalType;
  id: string;
}

// String format: "{type}:{id}"
// Examples:
const userPrincipal = "user:usr_abc123";
const orgPrincipal = "organization:org_xyz789";
const teamPrincipal = "team:team_def456";
```

## Principal Resolution

### Host Level

In `host/src/services/context.ts`, resolve principals from Better Auth session:

```typescript
async function resolvePrincipals(
  session: Session,
  db: Database
): Promise<PrincipalRef[]> {
  const principals: PrincipalRef[] = [];
  
  // Always include user principal
  principals.push({ type: "user", id: session.user.id });
  
  // Query organizations where user is member
  const memberships = await db.query.member.findMany({
    where: eq(member.userId, session.user.id),
    with: { organization: true },
  });
  
  for (const m of memberships) {
    principals.push({ type: "organization", id: m.organizationId });
  }
  
  // Query teams where user is member (via teamMember)
  const teamMemberships = await db.query.teamMember.findMany({
    where: eq(teamMember.memberId, ...), // join through member
    with: { team: true },
  });
  
  for (const tm of teamMemberships) {
    principals.push({ type: "team", id: tm.teamId });
  }
  
  return principals;
}
```

### Principal Set

The full set of principals for a request:

```typescript
interface RequestContext {
  user: User | null;
  userId: string | null;
  principalRefs: PrincipalRef[];  // Structured principals
  principalSet: string[];            // String format for quick lookup
}
```

## Grant Tables

Grants link principals to resources with roles:

### Workspace Grants

```typescript
// api/src/db/schema/workspaces.ts
table("workspace_grants", {
  workspaceId: string (fk),
  principalType: string,  // "user" | "organization" | "team"
  principalId: string,
  role: string,  // "owner" | "admin" | "editor" | "viewer"
  createdByUserId: string,
  createdAt: timestamp,
  // Primary key: (workspaceId, principalType, principalId)
});
```

### Space Grants

Same structure for spaces. Public spaces have implicit viewer grant for everyone.

## Permission Evaluation

### Role Hierarchy

```
owner > admin > editor > viewer

owner:
  - read, edit, delete
  - publish (to owned spaces)
  - manage grants (add/remove any)
  - archive

admin:
  - read, edit
  - publish (to accessible spaces)
  - manage grants (except owner)
  - archive

editor:
  - read, edit
  - publish (to accessible spaces)

viewer:
  - read only
```

### Permission Computation

```typescript
interface PermissionSet {
  role: ResourceRole | null;
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canManageGrants: boolean;
}

function computePermissions(
  grants: Grant[],
  principalSet: string[],
  isOwner: boolean,
  visibility: "private" | "unlisted" | "public"
): PermissionSet {
  // Find best matching grant
  const matchingGrants = grants.filter(g => 
    principalSet.includes(`${g.principalType}:${g.principalId}`)
  );
  
  if (matchingGrants.length === 0 && visibility === "public") {
    // Public resource, no grants needed for read
    return {
      role: null,
      canRead: true,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      canManageGrants: false,
    };
  }
  
  // Get highest role
  const role = getHighestRole(matchingGrants.map(g => g.role));
  
  return {
    role,
    canRead: true,
    canEdit: ["owner", "admin", "editor"].includes(role),
    canDelete: ["owner", "admin"].includes(role) || isOwner,
    canPublish: ["owner", "admin", "editor"].includes(role),
    canManageGrants: ["owner", "admin"].includes(role),
  };
}
```

### Workspace Permission Rules

```typescript
async function checkWorkspacePermission(
  db: Database,
  workspaceId: string,
  action: "read" | "edit" | "delete" | "publish" | "manageGrants",
  context: RequestContext
): Promise<{ allowed: boolean; role: ResourceRole | null }> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    with: { grants: true },
  });
  
  if (!workspace) throw new Error("Workspace not found");
  
  const isOwner = workspace.createdByUserId === context.userId;
  
  const permissions = computePermissions(
    workspace.grants,
    context.principalSet,
    isOwner,
    workspace.visibility
  );
  
  const actionMap = {
    read: permissions.canRead,
    edit: permissions.canEdit,
    delete: permissions.canDelete,
    publish: permissions.canPublish,
    manageGrants: permissions.canManageGrants,
  };
  
  return {
    allowed: actionMap[action],
    role: permissions.role,
  };
}
```

### Thing Permission Rules

Things inherit from their workspace, with additional publication visibility:

```typescript
async function checkThingPermission(
  db: Database,
  thingId: string,
  action: "read" | "edit" | "delete" | "publish" | "manageGrants",
  context: RequestContext
): Promise<{ allowed: boolean; role: ResourceRole | null }> {
  const thing = await db.query.things.findFirst({
    where: eq(things.id, thingId),
    with: { workspace: { with: { grants: true } } },
  });
  
  if (!thing) throw new Error("Thing not found");
  
  // First check workspace-level permission
  const workspaceCheck = await checkWorkspacePermission(
    db, thing.workspaceId, action, context
  );
  
  if (workspaceCheck.allowed) {
    return workspaceCheck;
  }
  
  // If not allowed via workspace, check if thing is publicly visible
  if (action === "read" && thing.visibility === "public") {
    return { allowed: true, role: null };
  }
  
  // Check if thing is published to a public space
  if (action === "read") {
    const publications = await db.query.publications.findMany({
      where: eq(publications.thingId, thingId),
      with: { space: true },
    });
    
    const hasPublicPublication = publications.some(
      p => p.space.visibility === "public"
    );
    
    if (hasPublicPublication) {
      return { allowed: true, role: null };
    }
  }
  
  return { allowed: false, role: null };
}
```

## Grant Management

### Adding a Grant

```typescript
async function addGrant(
  db: Database,
  resourceType: "workspace" | "space",
  resourceId: string,
  principal: PrincipalRef,
  role: ResourceRole,
  createdByUserId: string
): Promise<Grant> {
  // Check if granter has manageGrants permission
  // ... permission check ...
  
  const grant = {
    [`${resourceType}Id`]: resourceId,
    principalType: principal.type,
    principalId: principal.id,
    role,
    createdByUserId,
    createdAt: new Date(),
  };
  
  await db.insert(workspaceGrants).values(grant).onConflictDoUpdate({
    target: [workspaceGrants.workspaceId, workspaceGrants.principalType, workspaceGrants.principalId],
    set: { role, createdByUserId },
  });
  
  return grant;
}
```

## UI Considerations

### Principal Picker

For grant forms and owner selection:

```typescript
function usePrincipalOptions() {
  const { data: identity } = useQuery(identityMeQueryOptions());
  
  return identity?.principals.map(p => ({
    label: formatPrincipal(p),
    value: p,
  })) ?? [];
}

// Render as:
// - user: User ID (you)
// - organization: Org Name (org)
// - team: Team Name (team in Org)
```

### Permission UI

Always show the computed permission set:

```typescript
function PermissionPanel({ permissions }: { permissions: PermissionSet }) {
  return (
    <div>
      <Badge>Role: {permissions.role ?? "none"}</Badge>
      <div className="permissions-grid">
        <span>Read: {permissions.canRead ? "✓" : "✗"}</span>
        <span>Edit: {permissions.canEdit ? "✓" : "✗"}</span>
        <span>Delete: {permissions.canDelete ? "✓" : "✗"}</span>
        <span>Publish: {permissions.canPublish ? "✓" : "✗"}</span>
        <span>Manage Grants: {permissions.canManageGrants ? "✓" : "✗"}</span>
      </div>
    </div>
  );
}
```

## Security Notes

1. **Trust Host Context:** The API layer trusts that the host has correctly resolved principals from Better Auth. The API should not re-query Better Auth tables directly.

2. **Grant Conflicts:** When a user has multiple grants (direct user grant + organization membership), use the highest role.

3. **Public Resources:** Public visibility does not imply grants exist. Check visibility in permission logic.

4. **Owner Override:** Resource creators should retain owner-level access even if grants are removed.

## Related Files

- `host/src/services/authz.ts` - Principal resolution
- `host/src/services/context.ts` - Request context with principals
- `api/src/lib/permissions.ts` - Permission evaluation
- `api/src/services/permissions.ts` - Permission checking service
