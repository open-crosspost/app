# Agent Instructions for everything-dev

This document provides operational guidance for AI agents working on the everything-dev codebase.

## Quick Reference

**Start Development:**
```bash
bos dev --host remote   # Typical: remote host, local UI + API
```

**Production Preview:**
```bash
bos start --no-interactive   # All remotes, production URLs
```

**Check Status:**
```bash
bos ps        # List running processes
bos status    # Check remote health
bos info      # Show configuration
```

## Development Workflow

### Typical Session
1. Run `bos dev --host remote` to start development
2. UI available at http://localhost:3002, API at http://localhost:3014
3. Check `.bos/logs/` for process logs if issues occur
4. Use `bos kill` to clean up processes when done

### Isolating Work
- `bos dev --api remote` - Work on UI only
- `bos dev --ui remote` - Work on API only
- `bos dev` - Full local (rarely needed)

### Debugging Issues

**API not responding:**
- Check `bos ps` to see if API process is running
- Check `.bos/logs/api.log` for errors
- Run `bos status` to verify remote health

**UI not loading:**
- Verify host is running: `bos ps`
- Check browser console for Module Federation errors
- Clear browser cache and retry

**Type errors:**
- Run `bun typecheck` (checks both ui and api)
- Ensure api/src/contract.ts is in sync with UI usage

## Code Changes

### Making Changes
- **UI Changes**: Edit `ui/src/` files → hot reload automatically
- **API Changes**: Edit `api/src/` files → hot reload automatically
- **New Components**: Create in `ui/src/components/ui/`, export from `ui/src/components/index.ts`
- **New Routes**: Create file in `ui/src/routes/`, TanStack Router auto-generates tree

### Style Requirements
- Use semantic Tailwind classes: `bg-background`, `text-foreground`, `text-muted-foreground`
- No hardcoded colors like `bg-blue-600`
- No code comments in implementation
- Follow existing patterns in neighboring files

### Adding API Endpoints
1. Define in `api/src/contract.ts`
2. Implement handler in `api/src/index.ts`
3. Use in UI via `apiClient` from `@/remote/orpc.ts`

## Git Workflow

**Always follow CONTRIBUTING.md for git workflow:**
- Create feature branches: `git checkout -b feature/description`
- Use semantic commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Run tests and typecheck before committing
- Push to fork, open PR to main

See [CONTRIBUTING.md](./CONTRIBUTING.md) for complete workflow details.

## Changesets

**When to add a changeset:**
- Any user-facing change (features, fixes, deprecations)
- Breaking changes
- Skip for: docs-only changes, internal refactors, test-only changes

**Create changeset:**
```bash
bun run changeset
# Follow prompts to select packages and describe changes
```

**What happens in CI:**
- Changesets are versioned automatically on merge to main
- Releases published via `.github/workflows/release.yml`
- GitHub releases created for api and ui packages

## Documentation Hierarchy

| File | Purpose | Use When |
|------|---------|----------|
| **AGENTS.md** | This file - agent operational guide | Starting work on this repo |
| **README.md** | Human quick start, high-level overview | Understanding project basics |
| **CONTRIBUTING.md** | Contribution guidelines, git workflow | Preparing to contribute |
| **LLM.txt** | Deep technical reference | Implementing features, debugging |
| **api/README.md** | API-specific docs | Working on API plugin |
| **ui/README.md** | UI-specific docs | Working on frontend |
| **host/README.md** | Host-specific docs | Working on server |

## Available Skills

When working on this project, check for the `bos` skill:

```bash
npx openskills read bos
# Or read directly:
# .agent/skills/bos/SKILL.md
```

The `bos` CLI skill covers:
- Development workflows (`bos dev`, `bos start`)
- Build and deploy processes
- Project management commands
- Troubleshooting common issues

## Testing & Quality

**Before committing:**
```bash
bun test        # Run all tests
bun typecheck   # Type check all packages
bun lint        # Run linting (after setup)
```

## Common Patterns

### Authentication Check
Routes requiring auth use `_authenticated.tsx` layout:
```typescript
export const Route = createFileRoute('/_layout/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();
    if (!session?.user) {
      throw redirect({ to: '/login', search: { redirect: location.pathname } });
    }
  },
});
```

### API Client Usage
```typescript
import { apiClient } from '@/remote/orpc';

const { data } = await apiClient.getData({ id: '123' });
```

## Troubleshooting

**Process won't start:**
```bash
bos kill        # Kill all tracked processes
bun install     # Ensure dependencies
bos dev --host remote   # Restart
```

**Module Federation errors:**
- Check `bos.config.json` URLs are accessible
- Verify shared dependency versions match in package.json
- Clear browser cache

**Database issues:**
```bash
bun run db:push   # Push schema changes
bun run db:studio # Open Drizzle Studio
```

## Environment

**Required files:**
- `.env` - Secrets (see `.env.example`)
- `bos.config.json` - Runtime configuration (committed)

**Key ports:**
- 3000 - Host (when running full local)
- 3002 - UI dev server
- 3014 - API dev server

## Questions?

- Check the relevant README in this hierarchy
- Review LLM.txt for technical deep-dives
- See CONTRIBUTING.md for contribution questions
