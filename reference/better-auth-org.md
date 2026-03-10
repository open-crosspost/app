# Better Auth Organization Plugin

Reference documentation for the Better Auth organization plugin, based on official docs and GitHub issues.

## Official Documentation

- **Main docs:** https://www.better-auth.com/docs/plugins/organization
- **Plugin source:** https://github.com/better-auth/better-auth/tree/main/packages/better-auth/src/plugins/organization

## What It Provides

When you add the organization plugin, Better Auth automatically manages:

1. **Organizations** - Multi-tenant workspace container
2. **Members** - User membership in organizations with roles
3. **Invitations** - Email-based invitation flow
4. **Teams** (optional) - Sub-groups within organizations
5. **Active Organization** - Session-scoped current org context

## Default Schema

The plugin adds these tables (when using Drizzle):

### `organization`
```typescript
{
  id: string (pk)
  name: string
  slug: string (unique)
  logo: string | null
  metadata: string | null (JSON)
  createdAt: Date
}
```

### `member`
```typescript
{
  id: string (pk)
  organizationId: string (fk → organization.id)
  userId: string (fk → user.id)
  role: string (default: "member")
  createdAt: Date
}
```

### `invitation`
```typescript
{
  id: string (pk)
  organizationId: string (fk → organization.id)
  email: string
  role: string
  status: string ("pending" | "accepted" | "rejected" | "canceled")
  expiresAt: Date
  inviterId: string (fk → user.id)
}
```

### `team` (when teams.enabled: true)
```typescript
{
  id: string (pk)
  name: string
  organizationId: string (fk → organization.id)
  createdAt: Date
}
```

### `teamMember` (when teams.enabled: true)
```typescript
{
  id: string (pk)
  teamId: string (fk → team.id)
  memberId: string (fk → member.id)
  createdAt: Date
}
```

## Installation

### 1. Add plugin to auth config

```typescript
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  plugins: [
    organization({
      teams: { enabled: true },  // Optional: enable teams
      async sendInvitationEmail(data) {
        // Send invitation email
      },
    }),
  ],
});
```

### 2. Generate or migrate schema

```bash
# Generate schema
npx auth generate

# Or migrate
npx auth migrate
```

### 3. Add client plugin

```typescript
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
  ],
});
```

## Server API

The plugin adds these endpoints:

### Organizations
- `POST /api/auth/organization/create`
- `POST /api/auth/organization/update`
- `POST /api/auth/organization/delete`
- `GET /api/auth/organization/list`
- `GET /api/auth/organization/get-full-organization`
- `POST /api/auth/organization/set-active`

### Members
- `POST /api/auth/organization/add-member`
- `POST /api/auth/organization/remove-member`
- `POST /api/auth/organization/update-member-role`

### Invitations
- `POST /api/auth/organization/invite-member`
- `POST /api/auth/organization/cancel-invitation`
- `POST /api/auth/organization/accept-invitation`
- `POST /api/auth/organization/reject-invitation`

### Teams (when enabled)
- `POST /api/auth/organization/create-team`
- `POST /api/auth/organization/delete-team`
- `POST /api/auth/organization/add-team-member`
- `POST /api/auth/organization/remove-team-member`

## Client API (React)

```typescript
// List organizations
const { data: organizations } = authClient.useListOrganizations();

// Create organization
await authClient.organization.create({
  name: "My Org",
  slug: "my-org",
});

// Set active organization
await authClient.organization.setActive({
  organizationId: "org-id",
});

// Get active organization from session
const { data: session } = await authClient.getSession();
// session.user.organizationId contains active org

// With teams enabled
await authClient.organization.createTeam({
  name: "Engineering",
  organizationId: "org-id",
});
```

## Role System

Default roles: `owner` > `admin` > `member`

Role inheritance:
- Owner: all permissions including delete org, manage billing
- Admin: manage members, manage teams, cannot delete org
- Member: basic access, can be added to teams

## Schema Customization

```typescript
organization({
  schema: {
    organization: {
      modelName: "workspace",  // Rename table
      fields: {
        name: "title",  // Rename column
      },
      additionalFields: {
        billingId: { type: "string", required: false },
      },
    },
    member: {
      fields: {
        userId: "user_id",        // Custom column names
        organizationId: "org_id",
      },
    },
  },
});
```

## Important Notes

1. **Table Names:** Better Auth uses singular names by default (`organization`, `member`). Use `usePlural: true` in drizzleAdapter if your convention is plural.

2. **Field Mapping:** If you use snake_case columns, map them in schema config. Better Auth expects camelCase in the API but can map to any column names.

3. **Session Active Org:** The active organization is stored in the session. When checking membership, verify against the active org or list all orgs.

4. **Teams:** Teams are optional. Enable only if you need sub-groups within organizations.

5. **Invitations:** Configure `sendInvitationEmail` for production. Without it, invitations exist in DB but emails aren't sent.

## Related Files in This Repo

- `host/src/services/auth.ts` - Auth configuration
- `host/src/db/schema/auth.ts` - Auth schema (organization tables added here)
- `host/src/services/authz.ts` - Principal resolution from memberships
