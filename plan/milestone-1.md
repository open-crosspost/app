# Milestone 1: Better Auth Foundation and Organization Support

**Goal:** Establish Better Auth as the source of truth for authentication and organizations, with all auth methods working and org management via Better Auth.

**Phase:** Foundation layer. Everything else depends on this.

---

## Exit Criteria

- [x] Better Auth configured with all plugins (NEAR, email, phone, passkey, anonymous, admin, org, api-key)
- [x] All auth methods work: NEAR, email/password, phone OTP, passkey, anonymous
- [x] Organization plugin enabled with teams support
- [x] Personal organization auto-created for non-anonymous users
- [x] Organization context resolved in host request context
- [x] Organization management UI (list, create, invite, manage members)
- [x] Invitation acceptance flow
- [x] Type-safe from host → API → UI

---

## Completed Files

### Host Package

#### `host/src/services/auth.ts`
**Responsibility:** Better Auth configuration with all plugins.

**Completed:**
- All auth plugins configured: siwn, admin, anonymous, phoneNumber, passkey, organization, apiKey
- Email/password with verification enabled
- Organization plugin with invitation emails
- Auto-creation of personal organizations via database hooks
- Teams enabled in organization plugin

**Done when:**
- Better Auth endpoints available at `/api/auth/*`
- All auth methods functional

---

#### `host/src/db/schema/auth.ts`
**Responsibility:** Extended auth schema with organization and plugin tables.

**Completed:**
- Core Better Auth tables (user, session, account, verification)
- NEAR account linking table
- Passkey plugin table
- Organization plugin tables (organization, member, invitation)
- Team support tables (team, can add teamMember when needed)
- API key plugin table

**Done when:**
- All plugin tables present and exported
- Schema matches Better Auth plugin expectations

---

#### `host/src/services/context.ts`
**Responsibility:** Request context with organization resolution.

**Completed:**
- User identity resolution
- NEAR account linking resolution
- Organization context resolution from session
- Active organization loading with membership info
- Role-based permission helpers

**Done when:**
- Every request has resolved organization context
- Role hierarchy available for permission checks

---

#### `host/migrations/0000_tranquil_black_widow.sql`
**Responsibility:** Database migration for auth schema.

**Done when:**
- Fresh host DB bootstraps cleanly
- All auth tables present

---

### API Package

#### `api/src/contract.ts`
**Responsibility:** oRPC contract definitions.

**Completed:**
- Organization CRUD endpoints
- Member management endpoints
- Invitation endpoints
- API key management
- Original KV endpoints preserved

**Done when:**
- Contract matches UI needs
- Type-safe client generation works

---

#### `api/src/index.ts`
**Responsibility:** API plugin with organization handlers.

**Completed:**
- Organization CRUD handlers
- Member management handlers
- Invitation handlers
- API key handlers
- Auth middleware (requireAuth, requireNearAccount)

**Done when:**
- All contract endpoints implemented
- Proper auth middleware applied

---

### UI Package

#### `ui/src/routes/_layout/login.tsx`
**Responsibility:** Unified login page with all auth methods.

**Completed:**
- NEAR wallet sign-in
- Email/password sign-in and sign-up
- Phone OTP sign-in
- Passkey sign-in
- Anonymous sign-in
- Tab-based method selector
- Form validation and error handling

**Done when:**
- All auth methods work end-to-end
- Good UX with loading states and error messages

---

#### `ui/src/routes/_layout/_authenticated/organizations/index.tsx`
**Responsibility:** Organization list page.

**Completed:**
- List all user organizations
- Show active organization
- Personal organization indicator
- Link to create new organization
- Link to view organization details

---

#### `ui/src/routes/_layout/_authenticated/organizations/new.tsx`
**Responsibility:** Create new organization page.

**Completed:**
- Organization name input
- Auto-generated slug from name
- Logo URL (optional)
- Form validation
- Create via API

---

#### `ui/src/routes/_layout/_authenticated/organizations/$id.tsx`
**Responsibility:** Organization detail and member management.

**Completed:**
- Organization info display
- Member list with roles
- Invite member by email
- Role-based actions (owner can remove members)
- Switch to organization button

---

#### `ui/src/routes/accept-invitation/$invitationId.tsx`
**Responsibility:** Invitation acceptance page.

**Completed:**
- Requires authentication
- Accepts invitation via API
- Redirects to organization after acceptance

---

#### `ui/src/remote/auth-client.ts`
**Responsibility:** Better Auth client with all plugins.

**Completed:**
- All client plugins configured
- Proper baseURL from runtime
- Credentials included for cookies

---

## What's Different from Original Plan

### Removed (Overcomplicated)

1. **Principal-based authz layer** - Removed the `principalSet` / `PrincipalRef` abstraction
   - Reason: Overcomplicated for current needs
   - Better Auth's org context is sufficient
   - Can add later if multi-principal grants become needed

2. **Custom grants/permissions system** - Removed app-level permission evaluation
   - Reason: Better Auth's role system covers current needs
   - Org roles (owner > admin > member) provide sufficient granularity
   - Can add resource-level grants later if needed

3. **identity.me and permissions.check endpoints** - Not needed
   - Reason: Better Auth session provides all identity info
   - Organization context in request provides membership/role info
   - Direct Better Auth client calls handle auth checks

### Simplified Approach

**Better Auth owns:**
- User identity (all auth methods)
- Sessions
- Organizations and memberships
- Teams and team memberships (ready to use)
- Invitations
- API keys

**App Layer focuses on:**
- Organization UI built on Better Auth
- Resource ownership (via userId fields)
- Simple organization-based access (is member? what role?)

**Access Pattern:**
```typescript
// In context - already resolved
const { organization } = context;
if (!organization.hasOrganization) throw unauthorized;
if (!hasOrganizationPermission(context, "admin")) throw forbidden;

// In UI - use Better Auth directly
const { data: session } = await authClient.getSession();
const { data: orgs } = await authClient.organization.list();
```

---

## Testing

### Host Tests
- Organization auto-creation on user signup
- Context resolution with org membership
- Role-based permission helpers

### API Tests
- Organization CRUD operations
- Member management
- Invitation flow
- Auth middleware

### UI Tests
- All auth methods (NEAR, email, phone, passkey, anonymous)
- Organization management flows
- Invitation acceptance

---

## Next Steps (Post-Milestone)

1. **Resource Ownership** - Add `createdByUserId` and `organizationId` to app resources
2. **Organization-scoped Resources** - Filter resources by active organization
3. **Team Support** - Enable when needed for sub-organization grouping
4. **Advanced Permissions** - Add resource-level grants only if org roles prove insufficient

---

## Key Design Decisions

1. **Better Auth First** - Use Better Auth for all auth and org features rather than building parallel system
2. **Personal Organizations** - Every user gets a personal org (slug = user.id) automatically
3. **Progressive Onboarding** - Allow anonymous/email/phone signup, link NEAR later
4. **Unified Identity** - User ID is the canonical identity, NEAR account is optional linked identity
5. **No Principals Abstraction** - Keep it simple, add complexity only when proven needed

---

## References

- See `/reference/better-auth-org.md` for plugin details
- Better Auth docs: https://www.better-auth.com/docs/plugins/organization
