# Things and Types

The core product model is intentionally generic.

A `Type` defines what a thing is allowed to be.
A `Thing` is an actual instance of that type.

## Type = Definition

A type is the platform's description of a content kind.

A type can define:
- label and key
- field schema
- validation rules
- capabilities
- search behavior
- editor hints
- optional plugin or presentation behavior

Examples:
- `project`
- `person`
- `event`
- `place`

A type is not content. It is a contract for content.

## Thing = Instance

A thing is the content record users actually create and browse.

A thing typically includes:
- `id`
- `organizationId`
- `createdByUserId`
- `typeId` and `typeKey`
- `slug`
- `title`
- `summary`
- `attrs`
- `content`
- `status`
- `visibility`

A thing can also have:
- publications into spaces
- edges to other things
- attached assets
- activity
- reactions
- views that query across things

Examples:
- a project called "Near Scan"
- a person called "Alice"
- an event called "ETHChicago 2026"

## Things Follow Types

The most important rule is:

- every thing has one primary type
- many things can share the same type
- the type drives validation, rendering, and search

That means the system does not need a hardcoded "project page" or "person page".
Instead, it can say:

- load the thing
- inspect its type
- render type-aware UI
- still fall back to the generic inspector

This is what keeps the platform generic.

## Why This Split Matters

Because types and things are separate, the app can:
- generate forms from schemas
- render generic detail pages for all things
- filter and search by type
- attach optional custom rendering later
- keep the underlying data model stable

A good mental model is:

- Types are grammar
- Things are nouns
- Edges are verbs

## Start Simple

The best starting rule is:

- one primary type per thing

If richer semantics are needed, express them with edges instead of multiple primary types.

For example:
- thing type = `project`
- edge `built_for -> event`
- edge `created_by -> person`
- edge `located_in -> place`

That stays much cleaner than trying to make one thing be many incompatible content kinds at once.

## The Everything Graph

Together, types, things, and edges form a typed graph:

- **Types** define the node types
- **Things** are the nodes
- **Edges** are the typed relationships between nodes
- **Spaces** are publication surfaces
- **Workspaces** are authoring scopes

This graph is:
- generic (works for any content)
- extensible (add types without rebuilding)
- inspectable (generic views always work)
- flexible (custom rendering is additive)

That's the foundation of the platform.
