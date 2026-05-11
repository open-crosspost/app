---
"api": minor
"ui": minor
"plugins/crosspost": patch
---

Migrate UI to direct `apiClient.social.*` calls and implement the app-owned `social` API namespace. 

**API (`api`)**
- Add `social` router with endpoints for connected accounts (`list`, `connect`), posts (`submit`, `delete`, `get`), and activity (`list`, `leaderboard`, `summary`).
- Add `social_connected_accounts`, `social_platform_credentials`, and `social_activity` Drizzle schema with runtime `ensureSchema()`.
- Introduce `requireAuthContext` in `api/src/lib/auth.ts` for session-based route protection.
- Wire DB driver initialization and shutdown in `api/src/index.ts`.

**UI (`ui`)**
- Replace legacy proxy/authentication SDK (`authentication-service.ts`, `authorization-service.ts`, `use-post-mutations.ts`, `use-schedule-post.ts`, `use-scheduled-post-executor.ts`, `scheduled-post-manager.tsx`) with direct `apiClient.social.*` calls via `ui/src/lib/social.ts`.
- Simplify `platform-accounts-store.ts` to selection-only state.
- Disable social connect buttons with "coming soon" messaging until the connect flow is built.
- Remove `process.env` usage from `ui/src/config.ts` to fix the `process is not defined` editor crash.

**Plugin (`plugins/crosspost`)**
- Remove `near-sign-verify` dependency and replace token generation with a base64url stub.
- Purge all `api.opencrosspost.com` references from defaults, tests, docs, and dev config in favor of a neutral placeholder.
