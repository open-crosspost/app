# Plan 010 v2: Unified job specs/runs and the server tick

> **Executor instructions**: Implement in phases, running every verification
> command before moving on. The `job_specs`/`job_runs` model is shared with
> plan 009 v2 (campaign automations) — build it campaign-agnostic. If a STOP
> condition occurs, stop and report. When done, update the status row in
> `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 363dfb2..HEAD -- ui/src/hooks/use-scheduled-posts-executor.ts ui/src/store/scheduled-posts-store.ts ui/src/components/schedule-post-modal.tsx ui/src/components/scheduled-posts-feed.tsx api/src/db/schema.ts api/src/social/contract.ts`
> If any in-scope file changed since this plan was written, compare against
> the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MEDIUM
- **Depends on**: — (coordinates with 009 v2; one tick, N consumers)
- **Category**: direction
- **Planned at**: commit `363dfb2`, v2 revised 2026-10-31

## Settled decisions

1. **Unified job model**: one `job_specs` + `job_runs` pair replaces the
   planned `scheduled_posts` table and absorbs campaign automations (009 v2).
2. **Profile-level targets** everywhere: `{ platform, accountUserId }`
   instead of platform names. This fixes today's behavior where a scheduled
   post fires to *every* connected account on a platform
   (`use-scheduled-posts-executor.ts:49-51`).
3. **Automation timing**: daily-after-seed with a **random 1-10 minute
   jitter** materialized as a normal run (`scheduled_for = seed_time +
   random(60..600s)`); optional user-picked time-of-day override (client tz).
4. **Infra: no Redis, no new instances.** Postgres is the queue. The tick is
   an Effect daemon forked in the api plugin's `initialize`
   (`api/src/index.ts:85`), modeled on
   `plugins/connectors/src/index.ts:300-325` (variable-gated
   `SCHEDULER_ENABLED`, single-fork). Concurrency safety via atomic row
   claims: `UPDATE job_runs SET status='executing' WHERE id=$1 AND
   status='pending' RETURNING *` — works for hot-reload double-forks and a
   future multi-instance host (`FOR UPDATE SKIP LOCKED` if batch-claiming is
   ever needed). Redis revisit triggers: per-user webhooks/streaming ingest,
   shared rate-limit state across many instances, or thousands-of-runs/sec —
   none on the roadmap.
5. **NEAR signing**: automated campaign legs require a **sealed user
   function-call key** (Spike in 009 v2 §4 — agent-connect vault pattern).
   Scheduled one-off posts without a granted key use the browser-handoff
   fallback (`needs_signature`); automation specs simply require the key at
   enrollment for NEAR targets. X legs always fire server-side via the
   connectors bridge, app-paid, XPOST-gated at execution time.

## Problem (why it must move off the browser)

Scheduling works only while the tab is open: zustand + localStorage
(`ui/src/store/scheduled-posts-store.ts`), a 15s `setInterval` in the authed
layout (`ui/src/hooks/use-scheduled-posts-executor.ts:14`), no server-side
field in any contract, no table (`api/src/db/schema.ts`), no tests. Close the
tab and due posts silently wait, then fire all at once on the next visit.
`schedule-post-modal.tsx:71` even says so in a toast.

## Design

### Tables (phase 1)

```
job_specs
  id             uuid pk
  user_id        text  — owner
  kind           text  — 'scheduled' | 'campaign'
  campaign_id    text? — when kind='campaign'; content resolved from the
                       campaigns row (by reference, always fresh)
  action_id      text? — when kind='campaign'
  posts_json     text? — inline content for kind='scheduled'
  targets_json   text  — [{ platform, accountUserId }] (profile-level)
  schedule_json  text  — once: { mode:'once', at: iso }
                       daily: { mode:'daily', after:'seed'|'time', at?, tz? }
  reply_to_seed  bool  — campaign specs react to seeds
  status         text  — 'active' | 'paused'
  created_at / updated_at

job_runs
  id             uuid pk
  spec_id        uuid  — belongs to the caller's spec
  kind           text  — denormalized from spec for history clarity
  campaign_id    text? — denormalized
  scheduled_for  text  — when the run should fire
  status         text  — pending|executing|completed|failed|needs_signature
  result_json    text? — post ids/urls per target
  error          text?
  executed_at    text?
  created_at
  index on (scheduled_for, status), (spec_id), (user_id)
```

One-off scheduled posts: spec created with an imminent or future `once` run
row created immediately (or lazily by the tick). Daily campaign specs: run
rows **materialized by the tick per day** (idempotent per `(spec_id, date)`).

### Contract routes (phase 1)

Under `social.jobs.*` (auth: `requireAuthContext`):

- `specs.create` — POST `/social/jobs/specs` (validates future times; checks
  targets are the caller's connected accounts; XPOST gate precheck for X
  targets)
- `specs.list` — GET `/social/jobs/specs`
- `specs.update` — PATCH `/social/jobs/specs/{id}` (pause/resume/edit; owner-only)
- `specs.cancel` — DELETE `/social/jobs/specs/{id}` (owner-only; pending runs →
  cancelled)
- `runs.list` — GET `/social/jobs/runs?specId?` (the history feed)

### The tick (phase 2 — after 009 P1, this is 010's second landing)

In api plugin `initialize`:

```
if (config.secrets.SCHEDULER_ENABLED) fork(repeat(loop, Schedule.spaced("1 minute")))
loop =
  spawnRuns     — daily campaign specs with today's seed and no run today
                → insert run (subject = spec_id + date, no dupes)
  fireDueRuns   — claim due runs atomically; execute:
                  X legs → connectors bridge (in-process via PluginsClient),
                  app-paid, enforceXpostGate at execution
                  NEAR legs → sealed key when present;
                  else status='needs_signature' (handoff)
  recordResults — result_json, status completed/failed, executed_at
```

Gate failures at execution ⇒ run `failed` with the gate reason (never silent).
NEAR `needs_signature` runs for one-off specs persist until picked up (see
below) or cancelled; automation specs are never created without a NEAR key
when NEAR is targeted.

### UI (phase 1)

- `schedule-post-modal.tsx` — writes a spec (upgrade: profile targets AND
  timing UI show connected accounts, mirroring `PlatformAccountsSelector`).
- `scheduled-posts-feed.tsx` → "Scheduled & Automations": specs (manage:
  pause/resume/delete) + runs history for both kinds.
- `use-scheduled-posts-executor.ts` — re-point: query the API for
  `needs_signature` runs whose `scheduled_for <= now` (due and overdue),
  execute via the client submit path with the run's stored content, report
  result via `runs.report` (client executor remains the authenticator for
  keyless NEAR legs only).
- `ui/src/store/scheduled-posts-store.ts` — one-time best-effort import of
  localStorage rows into specs/runs (sign-in), then the store is deleted.

### Tests

- Unit (pglite `:memory:` driver): spec/run CRUD, owner gating, run claim
  atomicity (`UPDATE … RETURNING`), spawn idempotency per spec/day.
- Integration: fire an X-only due run through the tick with the bridge
  stubbed; assert ledger + status; gate refusal → failed with reason.

## Phases

1. **Phase 1 — tables + `social.jobs.*` routes + modal/feed/executor re-point**
   (browser executor keeps NEAR-leg duty for keyless cases).
2. **Phase 2 — the server tick** (X legs server-side first; NEAR server-side
   lands with 009 v2 Spike S outcome).
3. **Phase 3 — localStorage migration + delete the store.**

## Verification

- `pnpm run typecheck`, `pnpm run test`, `pnpm run lint` per phase.
- Manual: schedule a post 1 minute out with an X target only, close the tab —
  the tick fires it (results feed shows the tweet url). Cancel before firing —
  run never executes. Gate-refused target at creation or execution is
  surfaced, never silent.
- The old platform-level blast behavior is gone: a scheduled run hits exactly
  the selected accountIds.

## Risks

- Client executor + server tick double-firing the same run: the atomic claim
  means whichever actor wins the `pending → executing` transition fires it;
  the client must skip runs it fails to claim (include claim in
  `runs.claim`, not a blind UPDATE from the client).
- `scheduled_json` shape evolution: keep validation in one zod schema in
  `api/src/social/types.ts`, imported by both UI and API via the contract.
- Multi-instance claim races: single claimant by construction (UPDATE …
  WHERE status='pending'); verify with a test that two parallel claims yield
  one execution.
