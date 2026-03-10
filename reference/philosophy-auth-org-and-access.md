# Auth, Organizations, and Access

The current architecture is Better Auth first.

## Better Auth Is the Source of Truth

Better Auth owns:
- users
- sessions
- organizations
- members
- invitations
- teams
- team membership
- API keys
- auth methods

In this repo, that all lives in the `host` layer.

The app layer should not duplicate that auth model.

## Current Access Model

Milestone 1 deliberately simplified the earlier plan.

Instead of introducing a separate principal/grants abstraction immediately, the current model is:

- Better Auth provides user and organization context
- every request resolves the active organization and membership role
- app resources are scoped by `organizationId`
- resources also track `createdByUserId`
- access checks are mostly:
  - is the user a member of the active organization?
  - what is their organization role?
  - are they the creator/owner of the resource?

This gives a practical model now, without overbuilding.

## Role Hierarchy

Better Auth organization roles are the primary access control layer:

- `owner`
- `admin`
- `member`

That is enough for the current phase to support:
- organization management
- member invites
- scoped app resources
- basic edit/admin distinctions

If later the app needs resource-level grants, they can be added on top.
But they are not required to start.

## Personal Organizations

A key decision in Milestone 1 is that every non-anonymous user gets a personal organization automatically.

That gives each user:
- a private home scope
- a default organization context
- a place to create resources even before joining a team or shared org

This keeps onboarding simple and avoids the question:
"where does a newly created thing belong?"

The answer is always:
- the active organization
- or the user's personal organization by default

## Resource Ownership

The app layer should focus on resource ownership and organization scoping, not rebuilding auth.

A typical app resource should include:
- `organizationId`
- `createdByUserId`

That supports:
- org-scoped queries
- "my resources" queries
- simple ownership checks
- future team filtering if needed

## Teams

Teams are enabled in Better Auth and available to use, but they are not yet the main app-level permission model.

That is intentional.

The current philosophy is:
- organizations are the main scope
- teams are available when subgrouping becomes valuable
- resource-level grants should only be introduced if org roles are not enough

## Why This Simpler Model Is Good

It keeps the system aligned with what already works:
- Better Auth session
- Better Auth organization context
- Better Auth roles

And it avoids introducing a second parallel authz language too early.

So for now the system should think in terms of:
- current user
- current organization
- current role
- resource creator
- optional team support later

## Permission Flow

```
User signs in
    ↓
Better Auth creates session
    ↓
Host middleware resolves context
    - user identity
    - active organization (from session or cookie)
    - membership/role in active org
    - optional: NEAR account linking
    ↓
Request reaches API/UI
    ↓
App checks:
    - is this resource in the active org?
    - is user member with sufficient role?
    - is user the creator/owner?
    ↓
Grant or deny access
```

This is clean because Better Auth does the heavy lifting.

## Future Enhancements

When needed, the system can add:
- team-scoped resources (use Better Auth team context)
- resource-level grants (custom grants table)
- invitations to resources (custom invitation flow)
- advanced permissions (custom permission evaluation)

But that is complexity that should only be added when the simple model proves insufficient.
