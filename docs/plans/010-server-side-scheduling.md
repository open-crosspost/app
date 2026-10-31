# Plan 010: Server-side post scheduling

> **Executor instructions**: This is a design/spec plan — implement in phases,
> running every verification command before moving on. Reconcile with plan 009
> (one scheduler, two consumers — the daily gm tick and scheduled posts share
> the same server tick). If a STOP condition occurs, stop and report. When
> done, update the status row for this plan in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c8ffde2..HEAD -- ui/src/hooks/use-scheduled-posts-executor.ts ui/src/store/scheduled-posts-store.ts ui/src/components/schedule-post-modal.tsx api/src/db/schema.ts api/src/social/service.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L (multi-session)
- **Risk**: MEDIUM (auth-at-execution is the hard part)
- **Depends on**: — (coordinates with 009 Phase 4 for the shared tick)
- **Category**: direction (audit finding DIRECTION-03)
- **Planned at**: commit `c8ffde2`, 2026-10-31

## Problem

Scheduling works **only while the browser tab is open**:

- schedule UI: `ui/src/components/schedule-post-modal.tsx` (validates future
  time :62-66, requires sign-in :55-60; toast at :71 admits *"It fires while
  the app is open"*);
- storage: zustand + localStorage (`ui/src/store/scheduled-posts-store.ts`,
  key `crosspost-scheduled-posts`);
- executor: `ui/src/hooks/use-scheduled-posts-executor.ts` — 15s
  `setInterval` (:14) in the authenticated layout, publishing via
  `useSubmitPost`; close the tab and due posts silently wait, then fire all at
  once on the next visit;
- server side: nothing — no scheduled-time field in any contract
  (`api/src/social/contract.ts:62-103`, `api/src/contract.ts`), no
  `scheduled_posts` table (`api/src/db/schema.ts` is 71 lines: three tables),
  and the api `initialize` (`api/src/index.ts:85`) starts no timers.

Consequences: no cross-device persistence, no reliability guarantee, and zero
test coverage of the scheduling path.

## Why the current design is browser-only (and what actually unblocks server firing)

Per `use-scheduled-posts-executor.ts:16-19`: NEAR Social posting **signs with
the user's live wallet session**, so the client had to own execution. That
constraint is now solvable per leg:

- **X leg**: posting goes through `connectors.outlayerCall` server-side on the
  app's sponsored key — the server can already do this for a connected X
  account with no user key involved. Execute server-side.
- **NEAR Social leg**: two candidate mechanisms (decide in Spike S):
  1. **Limited-access key**: user grants the relayer path a function-call
     limited-access key scoped to `__fastdata_kv` on `social.near` (near-kit
     supports registering limited access keys). Server can then sign the
     post for them, gasless via the existing delegate/relayer machinery.
  2. **Browser handoff fallback**: the scheduled NEAR Social leg keeps a
     client executor role — the server marks it due-but-pending-signature and
     the existing browser executor (already mounted in the authed layout)
     picks it up on next visit. No data loss, still better than localStorage
     alone.

## Design

### 1. Persistence

- `scheduled_posts` table (Drizzle, `api/src/db/schema.ts`): `id` (uuid),
  `user_id`, `scheduled_for` (timestamp), `posts` (jsonb — the editor's
  `posts` array), `platforms` (jsonb), `status`
  (`pending|executing|completed|failed|needs_signature`), `error` (text?),
  `created_at/executed_at`.
- Contract routes (`api/src/social/contract.ts`):
  - `scheduledPosts.create` — validates future `scheduledFor`, stores rows.
  - `scheduledPosts.list` / `.cancel` / `.get` — per-user.
- UI switch: `ui/src/store/scheduled-posts-store.ts` becomes a thin cache over
  the API (TanStack Query), keeping the modal UX
  (`schedule-post-modal.tsx`) and the Scheduled tab untouched; migrate
  existing localStorage rows once on sign-in (best-effort import, then drop
  the persisted store).

### 2. The server tick (shared with plan 009)

One Effect daemon in the api plugin's `initialize` (`api/src/index.ts:85`),
modeled on the connectors gate-refresh precedent
(`plugins/connectors/src/index.ts:300-325`):
`Effect.runFork(Effect.repeat(loop, Schedule.spaced("1 minute")))`, gated by a
plugin variable (e.g. `SCHEDULER_ENABLED`) so hosts can disable it. Tick
responsibilities:

1. Find `pending` rows where `scheduled_for <= now`, mark `executing`.
2. Execute the **X leg** server-side via `outlayerCall` (ledger the sponsored
   compute like a live submit; the XPOST gate applies at execution time — a
   row that fails the gate lands in `failed` with the gate reason).
3. Execute the **NEAR Social leg** server-side if the user has an accepted
   limited-access key (Spike S option 1); otherwise set `needs_signature` and
   leave it for the browser executor.
4. Record results (post ids/urls) and set `completed`/`failed`; expose status
   in the Scheduled tab and results feed.

### 3. Tests (none exist today)

- Unit: due-row selection, state machine transitions, gate-refused failure.
- Integration: post an X-only scheduled row through the tick with the
  connectors bridge stubbed; assert ledger + status.

## Phases

1. **Phase 1** — table + contract + create/list/cancel API; modal writes to
   the API (browser executor untouched).
2. **Phase 2** — Spike S (limited-access key feasibility, write findings in
   this file), then the server tick for the X leg only.
3. **Phase 3** — NEAR Social leg per Spike S outcome; localStorage migration;
   delete the localStorage store; tests.

## Verification

- `pnpm run typecheck`, `pnpm run test`, `pnpm run lint` per phase.
- Manual: schedule a post 1 minute out, close the tab, reopen after 2 minutes
  — the X leg must have fired server-side (results feed shows the tweet url);
  NEAR Social leg status is `completed` (key granted) or `needs_signature`
  (fallback) rather than silently waiting.
- Negative: XPOST gate refused at execution time → row lands `failed` with the
  gate reason and the UI surfaces it.

## Risks

- Limited-access key grant UX adds an approval step to scheduling (Spike S
  decides; the fallback keeps UX unchanged but preserves the open-tab gap for
  NEAR Social only).
- Scheduler tick + plugin lifecycle: ensure single-fork (no duplicate timers on
  hot reload) — mirror the connectors daemon's variable-gated startup.
- Timezone handling: keep `scheduled_for` UTC; the modal already validates
  local time (`schedule-post-modal.tsx:91` notes "Times are local").
- Baseline exposure: this plan and 009 share the tick; whoever lands first
  should leave the tick generic (per-row `platforms`), not gm-specific.
