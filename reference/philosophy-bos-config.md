# bos.config.json and Runtime Composition

`bos.config.json` is part of the runtime layer, not the content layer.

## What bos.config.json Is

It is a runtime composition manifest.

It tells the system:
- which account or upstream config to extend
- which UI remote to load
- which API remote to use
- which environment values apply in development or production

In this repo, the local config currently looks like:

```json
{
  "extends": "bos://every.near/everything.dev",
  "account": "dev.everything.near",
  "app": {
    "ui": {
      "name": "ui",
      "development": "http://localhost:3002"
    },
    "api": {
      "name": "api",
      "development": "http://localhost:3014",
      "variables": {},
      "secrets": []
    }
  },
  "testnet": "dev.allthethings.testnet"
}
```

So the file is describing how the platform is assembled at runtime.

## What It Is Not

`bos.config.json` is not primarily a domain `Thing`.

It is not the same kind of object as:
- a project thing
- a person thing
- a publication
- a view

Those are user-facing content/domain resources.

`bos.config.json` is infrastructure/runtime configuration.

## Why It Matters

Because runtime config is externalized, the system can:
- swap remotes without rebuilding the host
- use local UI/API in development
- use deployed UI/API in production
- inherit defaults from a shared upstream config
- override only what is needed in the current environment

That is what makes the remote architecture practical.

## How It Fits With Host, UI, and API

The host reads `bos.config.json` to know:
- where the UI remote lives
- where the API remote lives
- which environment namespace/account it belongs to

Then the host composes the running app from those remotes.

So `bos.config.json` is the assembly instruction for the platform.

## The Extends Field

The `extends` field is especially important.

In the current file:

```json
{
  "extends": "bos://every.near/everything.dev"
}
```

That means:
- there is a shared base runtime definition elsewhere
- this repo only overrides what it needs locally

This is useful because it separates:
- platform defaults
- local development overrides
- deployment-specific changes

You can think of it like class inheritance:
- the extended config is the base class
- this config is the subclass
- local values override inherited ones

## Configuration vs Content

It is worth distinguishing:

**Configuration (bos.config.json)**
- How the platform runs
- Which remotes to load
- Environment overrides
- Runtime wiring

**Content (Things)**
- What users create
- Projects, people, events
- Publications, views
- Domain objects

These are different layers:
- Config is infrastructure
- Content is domain

Both are important, but they serve different purposes.

## Could It Ever Be Modeled As a Thing?

Possibly, but only secondarily.

You could represent deployment manifests or runtime configs as typed content later, for:
- audit history
- governance
- changelogs
- environment comparison
- publishing workflows

If you did that, it would probably be a special type like:
- `runtime-config`
- `deployment-manifest`
- `app-composition`

But that should be a projection or mirror, not the canonical runtime boot source.

The canonical source of runtime composition should remain config, not content.

## The Best Mental Model

- `Thing` = content or domain object
- `Type` = schema/definition for content
- `bos.config.json` = runtime wiring for the platform

So the right question is not:
- "is bos.config.json a thing?"

The better answer is:
- it can be represented as content later if useful
- but in the architecture, it is first-class runtime configuration

## Why This Separation Is Healthy

Keeping config and content separate means:

- the platform can boot without querying the content graph
- content can reference types without knowing about runtime wiring
- runtime can be reconfigured without changing content
- content can evolve without changing runtime wiring

That separation of concerns makes the system more robust.

## Summary

`bos.config.json` is the runtime manifest.
It tells the host how to assemble the platform from remotes.
It is not user-facing content, but platform infrastructure.
It can be mirrored as content later for convenience, but should not be the canonical boot source.
