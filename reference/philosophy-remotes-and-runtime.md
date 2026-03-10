# Remote UI, Remote API, and Runtime Composition

This project is not a single bundled app.
It is a runtime-composed system.

## The Three Layers

There are three distinct pieces:

- `host`
- remote `ui`
- remote `api`

## Host

The `host` is the runtime shell.

It is responsible for:
- Better Auth
- request/session handling
- organization context resolution
- serving the main app shell
- loading runtime configuration
- loading the remote UI
- connecting the remote API

The host is the trust boundary.

It owns:
- user identity
- sessions
- organizations
- authentication

## Remote UI

The remote UI is the product experience.

It is responsible for:
- routes
- pages
- forms
- inspectors
- onboarding flows
- typed use of `authClient`
- typed use of `apiClient`

Because it is a remote module, it can be built and deployed separately from the host.

It receives from the host:
- the running shell
- the configured auth client
- the configured api client
- the resolved context (user, org, etc.)

## Remote API

The remote API is the app-domain backend.

It is responsible for:
- oRPC contract
- app resources (things, types, workspaces, spaces)
- business logic
- database access
- app-specific workflows
- normalized responses for the UI

It should focus on domain logic, not auth ownership.

It receives from the host:
- the request context with user/org
- the ability to check auth via that context

## Where every-plugin Fits

`every-plugin` is the packaging and runtime model for the remote API.

That means the API is not just a local server module.
It is a deployable plugin that:
- defines a contract
- initializes services
- exposes handlers
- can be loaded by the host at runtime

This gives the API a clean deployment boundary.

## Why This Split Exists

This architecture gives:
- centralized auth in host
- independent UI deployment
- independent API deployment
- type-safe UI/API communication
- runtime composition through config instead of rebuilds

The result is a platform that is easier to evolve.

## The Contract Boundaries

### Between Host and UI

The host loads the UI as a Module Federation remote.

The UI exports:
- Router component
- Hydration entry
- Shared components

The host provides:
- Runtime configuration
- Auth client
- Query client
- Router context

### Between Host and API

The host loads the API as an every-plugin.

The API exports:
- oRPC router
- Contract definition

The host provides:
- Request context
- Database layer
- Plugin runtime

### Between UI and API

The UI calls the API through oRPC.

The contract is:
- defined in `api/src/contract.ts`
- imported by UI for type inference
- served over HTTP via oRPC handlers
- type-safe end-to-end

## Typed Clients

There are two important typed clients:

### authClient

`authClient` is the typed Better Auth client.

It is how the UI should access:
- session
- sign in/out
- organizations
- invitations
- members
- API keys
- teams when needed

```typescript
const { data: session } = await authClient.getSession();
const { data: orgs } = await authClient.organization.list();
```

### apiClient

`apiClient` is the typed oRPC client for app-domain features.

It is how the UI should access:
- types
- things
- workspaces
- spaces
- publications
- assets
- views
- activity

```typescript
const { data: thing } = await apiClient.things.get({ id: "uuid" });
```

The UI should treat these as two different surfaces:
- auth and org operations through `authClient`
- app and content operations through `apiClient`

That separation is healthy.

## Development Flow

During development:

```
Host (remote) loads
    ↓
UI (local at localhost:3002)
    ↓
API (local at localhost:3014)
```

In production:

```
Host (deployed) loads
    ↓
UI (deployed remote)
    ↓
API (deployed remote)
```

The switch happens through runtime config, not code changes.

## Why This Matters for Custom Experiences

Because the UI is remote:
- you can build specialized UIs
- you can deploy them independently
- you can swap them via config
- you can have multiple UIs for different use cases

That is what enables custom onboarding, admin UIs, partner UIs, etc.
