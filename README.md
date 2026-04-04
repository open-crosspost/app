<!-- markdownlint-disable MD014 -->
<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD029 -->

<div align="center">

<h1 style="font-size: 4.25rem; font-weight: 800; line-height: 1; margin: 0;">everything</h1>

<img src="ui/src/assets/under-construction.gif" alt="Under construction" width="380" />

</div>

Module Federation monorepo with runtime-loaded configuration, demonstrating every-plugin architecture and NEAR Protocol integration.

Built with React, Hono.js, oRPC, Better-Auth, and Module Federation.

## Quick Start

```bash
bun install             # Install dependencies
bos dev --host remote   # Start development (typical workflow)
```

Visit http://localhost:3002 (UI) and http://localhost:3014 (API).

## CLI Commands

`everything-dev` is the canonical runtime package and CLI. `bos` is a command alias for the same tool. See [.agent/skills/bos/SKILL.md](.agent/skills/bos/SKILL.md) for the full reference.

### Development

```bash
everything-dev dev --host remote   # Remote host, local UI + API (typical)
everything-dev dev --ui remote     # Isolate API work
everything-dev dev --api remote    # Isolate UI work
everything-dev dev                 # Full local, client shell by default

# `bos` is an alias for the same commands
bos dev --ssr                      # Opt into local SSR
```

### Production

```bash
everything-dev start --no-interactive   # All remotes, production URLs
```

### Build & Publish

```bash
bos build               # Build all packages (updates bos.config.json)
bos publish             # Publish config to the temporary dev.everything.near registry
bos publish --deploy    # Build/deploy all workspaces, then publish
bun run publish         # Same publish command via root script
bos sync                # Sync from every.near/everything.dev
```

### Project Management

```bash
bos create project <name>   # Scaffold new project
bos info                    # Show configuration
bos status                  # Check remote health
bos clean                   # Clean build artifacts
```

## Development Workflow

### Making Changes

- **UI Changes**: Edit `ui/src/` → hot reload automatically → publish with `bos publish --deploy`
- **API Changes**: Edit `api/src/` → hot reload automatically → publish with `bos publish --deploy`
- **Host Changes**: Edit `host/src/` or `bos.config.json` → publish with `bos publish --deploy`

### Before Committing

Always run these commands before committing:

```bash
bun test        # Run all tests
bun typecheck   # Type check all packages
bun lint        # Run linting (see lint setup below)
```

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning:

**When to add a changeset:**
- Any user-facing change (features, fixes, deprecations)
- Breaking changes
- Skip for: docs-only changes, internal refactors, test-only changes

**Create a changeset:**
```bash
bun run changeset
# Follow prompts to select packages and describe changes
```

The release workflow (`.github/workflows/release.yml`) handles versioning and GitHub releases automatically on merge to main.

### Git Workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines including:
- Branch naming conventions
- Semantic commit format
- Pull request process

## Documentation

- **[AGENTS.md](./AGENTS.md)** - Quick operational guide for AI agents
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines and git workflow
- **[LLM.txt](./LLM.txt)** - Deep technical reference for implementation
- **[API README](./api/README.md)** - API plugin documentation
- **[UI README](./ui/README.md)** - Frontend documentation
- **[Host README](./host/README.md)** - Server host documentation

**Documentation Purpose:**
- `README.md` (this file) - Human quick start and overview
- `AGENTS.md` - Agent operational shortcuts
- `CONTRIBUTING.md` - How to contribute (branch, commit, PR workflow)
- `LLM.txt` - Technical deep-dive for implementation details
- Package READMEs (api/, ui/, host/) - Package-specific details

## Architecture

**Module Federation monorepo** with runtime-loaded configuration:

```
┌─────────────────────────────────────────────────────────┐
│                  host (Server)                          │
│  Hono.js + oRPC + bos.config.json loader                │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │ Module Federation│      │ every-plugin     │         │
│  │ Runtime          │      │ Runtime          │         │
│  └────────┬─────────┘      └────────┬─────────┘         │
│           ↓                         ↓                   │
│  Loads UI Runtime          Loads API Plugins            │
└───────────┬─────────────────────────┬───────────────────┘
            ↓                         ↓
┌───────────────────────┐ ┌───────────────────────┐
│    ui/ (Runtime)      │ │   api/ (Plugin)       │
│  React + TanStack     │ │  oRPC + Effect        │
│  ui/src/app.ts        │ │  remoteEntry.js       │
└───────────────────────┘ └───────────────────────┘
```

**Key Features:**
- ✅ **Runtime Configuration** - All URLs from `bos.config.json` (no rebuild needed)
- ✅ **Independent Deployment** - UI, API, and Host deploy separately
- ✅ **Type Safety** - End-to-end with oRPC contracts
- ✅ **UI Runtime Boundary** - `everything-dev/ui/client` and `/server` own router/runtime glue
- ✅ **CDN-Ready** - Module Federation with Zephyr Cloud

## Configuration

All runtime configuration lives in `bos.config.json`:

```json
{
  "account": "dev.everything.near",
  "domain": "everything.dev",
  "repository": "https://github.com/nearbuilders/everything-dev",
  "testnet": "dev.allthethings.testnet",
  "plugins": {
    "template": {
      "development": "local:plugins/_template"
    }
  },
  "app": {
    "host": {
      "name": "host",
      "development": "local:host",
      "production": "https://..."
    },
    "ui": {
      "name": "ui",
      "development": "local:ui",
      "production": "https://...",
      "ssr": "https://..."
    },
    "api": {
      "name": "api",
      "development": "local:api",
      "production": "https://...",
      "variables": {},
      "secrets": []
    }
  }
}
```

The temporary publish registry currently points at `dev.everything.near`, and `bos publish --deploy` is the release path when you want Zephyr URLs refreshed first.

### Railway

Use the repo `Dockerfile` for the service, and treat the GHCR image as the deployable artifact.

- Image source: `ghcr.io/<lowercased github.repository>:latest`
- Config updates: `bos.config.json` publish workflow; restart/redeploy is provider-specific
- Code updates: GHCR build workflow

Required runtime vars:
- `BOS_ACCOUNT=dev.everything.near`
- `GATEWAY_DOMAIN=everything.dev`

See [.agent/skills/bos/docs/types.md](.agent/skills/bos/docs/types.md) for the complete schema.

## Lint Setup

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check linting
bun lint

# Fix auto-fixable issues
bun lint:fix

# Format code
bun format
```

Biome is configured in `biome.json` at the project root. Generated files (like `routeTree.gen.ts`) are automatically excluded.

## Tech Stack

**Frontend:**
- React 19 + TanStack Router (file-based) + TanStack Query
- Tailwind CSS v4 + shadcn/ui components
- Module Federation for microfrontend architecture

**Backend:**
- Hono.js server + oRPC (type-safe RPC + OpenAPI)
- every-plugin architecture for modular APIs
- Effect-TS for service composition

**Database & Auth:**
- SQLite (libsql) + Drizzle ORM
- Better-Auth with NEAR Protocol support

## Related Projects

- **[every-plugin](https://github.com/near-everything/every-plugin)** - Plugin framework for modular APIs
- **[near-kit](https://kit.near.tools)** - Unified NEAR Protocol SDK
- **[better-near-auth](https://github.com/elliotBraem/better-near-auth)** - NEAR authentication for Better-Auth

## License

MIT
