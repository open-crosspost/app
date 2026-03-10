# Onboarding and Custom Experiences

One of the strongest ideas in this architecture is that the product experience itself can be swapped or specialized.

## Onboarding Is Just Another UI Experience

An onboarding flow does not need to be hardcoded into the main app forever.

It can be:
- part of the main remote UI
- a separate remote UI
- a temporary environment-specific UI
- a branded or partner-specific experience

Because both `authClient` and `apiClient` are typed, any onboarding surface can safely build on the same platform.

## What a Custom Onboarding Flow Can Do

A custom onboarding experience can:
- sign users in with Better Auth
- create or select organizations
- accept invitations
- collect profile or team info
- create starter workspaces or spaces
- seed initial things by type
- route the user into the main app

This works because onboarding is not special infrastructure.
It is just a UI talking to:
- Better Auth via `authClient`
- app APIs via `apiClient`

## Example Onboarding Flow

A typical onboarding path might be:

1. **Sign in**
   - User signs in via authClient
   - Session established
   - Personal organization already exists (auto-created)

2. **Organization setup**
   - User creates or joins an organization
   - Via authClient.organization.create or accept invitation

3. **Starter resources**
   - Onboarding creates a workspace via apiClient
   - Onboarding optionally creates a space via apiClient
   - Onboarding seeds starter things via apiClient

4. **Routing**
   - Onboarding routes user to the main app
   - With appropriate context set

That flow is fully compatible with the platform model.

## Deploying a Custom UI

Because the UI is remote, you can build a custom UI, deploy it, and point runtime config at it.

That means you can:
- experiment with onboarding
- ship branded experiences
- iterate without rewriting the host
- swap environments cleanly

## Swapping Through Runtime Config

The host does not need to be rewritten to use a new UI remote.
Instead, runtime config points the host at a different deployed UI.

In `bos.config.json`:

```json
{
  "app": {
    "ui": {
      "name": "ui",
      "development": "http://localhost:3002",
      "production": "https://my-custom-ui.example.com"
    }
  }
}
```

That is the big idea:
- UI is deployable
- API is deployable
- Host composes them

## What This Enables

This makes the platform feel more like an operating environment than a single fixed app.

You can imagine:
- a default editor UI
- an onboarding-first UI
- an admin-heavy UI
- a public-browse UI
- a partner-specific branded UI

All using the same:
- auth system
- organization model
- typed API
- core data model

## Building Your Own Experience

If you want to build a custom onboarding or product experience:

1. **Set up the client imports**
   ```typescript
   import { authClient } from "@/lib/auth-client";
   import { apiClient } from "@/remote/orpc";
   ```

2. **Use authClient for identity/org**
   ```typescript
   const { data: session } = await authClient.getSession();
   const { data: orgs } = await authClient.organization.list();
   ```

3. **Use apiClient for resources**
   ```typescript
   const workspace = await apiClient.workspaces.create({
     slug: "starter",
     title: "My First Workspace",
     organizationId: activeOrg.id,
   });
   ```

4. **Deploy as a remote**
   - Build with Rsbuild Module Federation
   - Export Router and Hydrate
   - Deploy to CDN

5. **Update config to point at your UI**
   - Update `bos.config.json`
   - Host loads your UI instead

That is the full loop for custom experiences.

## Why This Matters

Most platforms lock you into their UI.
This architecture separates the platform from the presentation.

That means:
- you can own the user experience
- you can evolve it independently
- you can specialize for different use cases
- you can still rely on the shared platform for auth and data

That is the power of the remote architecture.
