# Plan 009 v2: Server-side campaigns, the owner seed instance, and automation

> **Executor instructions**: Phases 1-2 are implementable now; phases 3-5 are
> gated by the spikes (STOP for review after phase 2). Run every verification
> command before moving on. If a STOP condition occurs, stop and report. When
> done, update the status row in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 363dfb2..HEAD -- ui/src/lib/campaigns.ts ui/src/lib/near-social-post.ts ui/src/lib/connector-post.ts plugins/connectors/src/index.ts plugins/connectors/src/services/gate-config.ts plugins/twitter/src/adapters/post.ts api/src/db/schema.ts api/src/social/contract.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L (multi-session)
- **Risk**: MEDIUM
- **Depends on**: docs/plans/004; spikes gate phases 3-5; phases 1-2 of 010 share job tables
- **Category**: direction
- **Planned at**: commit `363dfb2`, v2 revised 2026-10-31 with owner decisions

## Settled product decisions (owner-confirmed 2026-10-31)

1. gm campaign action text/label lowercase; campaign name stays "GM Campaign".
2. The daily seed fires from an **external owner instance** (small cron service
   or Hermes agent run by crosspost.near). The app holds **no**
   crosspost.near key. No LLM in the loop for anything right now; MCP
   campaign management arrives free later (see §6).
3. Join vs automate is the user's choice per campaign. Join = explicit
   participant row + editor prefill. Automate = one or more job specs
   (multiple automations per campaign allowed).
4. Automation config UX = the schedule UX generalized: user picks **specific
   profiles** (connected accounts, not platform names) and optional timing.
5. Timing: campaign automations fire **after the day's seed lands, plus a
   random 1-10 minute jitter per spec** (anti-spam-wall). The jitter is
   materialized as a normal scheduled run — spawning uses the same machinery
   as scheduling.
6. The app **always pays** for automated posts: X via the app's OutLayer key
   (XPOST-gated, Tier 2 per docs/TOKENOMICS.md), NEAR gas paid by the app when
   signing with the user's sealed function-call key.
7. Unified job model shared with plan 010: `job_specs` + `job_runs` (see 010
   v2 for the schema). No separate scheduled_jobs/campaign tables.
8. **No Redis; no new instances.** Postgres-backed queue with atomic row
   claims; the tick is an in-process Effect daemon (see 010 v2 infra note).

## Why this matters

Campaigns are a hardcoded UI array with no owner, no creation surface, and no
participation record beyond client-side text matching. The gm campaign needs a
landlord (daily seed so participation is a thread) and a real automation story.
Everything needed exists already: API-key auth surfaces, the OutLayer bridge,
an Effect-tick precedent, the XPOST gate, and the agent-connect vault pattern
for sealed credential storage.

## Current state

- **Campaign registry**: `ui/src/lib/campaigns.ts:28-46` — hardcoded
  `campaigns: Campaign[]` (id `gm`, action `{ text: "gm", label: "gm" }`,
  destinations near-social + twitter). Helpers `campaignPrefillPosts` (:61),
  `campaignDestinations` (:67), `postsMatchingCampaign` (:74).
- **NEAR Social write path** (`ui/src/lib/near-social-post.ts`):
  `buildFastDataKvArgs` (:65) writes `{ post/<ts>: { text } }` via
  `__fastdata_kv` on `social.near` (:13); `postToNearSocial` (:122) relays a
  delegate action through the app relayer; `postToNearSocialDirect` (:210) is
  the wallet fallback. **No reply/parent support.**
- **X write path** (`ui/src/lib/connector-post.ts`): `postToX` (:73) →
  `apiClient.connectors.outlayerCall({ input: { text } })`; server-side
  handler `plugins/connectors/src/index.ts:656` (runs `enforceXpostGate`,
  ledgering). **No reply_to passed.** The unused
  `plugins/twitter/src/adapters/post.ts:106` `reply()` adapter supports
  `in_reply_to_tweet_id` as a fallback design for BYO-X-credentials users.
- **API layer**: `api/src/social/contract.ts` routes over
  `SocialRepository` (`api/src/social/repository.ts`, raw-SQL
  `ensureSchema` :92 + typed drizzle queries) and `SocialService`
  (`api/src/social/service.ts`; create/reply/quote are stubs :187-206).
  Handlers in `api/src/index.ts` use `requireAuthContext`
  (`api/src/lib/auth.ts:82` — session or API-key principal that resolves to
  `userId`).
- **Tick precedent**: `plugins/connectors/src/index.ts:300-325` —
  `Effect.runFork(Effect.repeat(loop, Schedule.spaced("24 hours")))`
  gated by a plugin variable. TOKENOMICS.md reserves this pattern for the
  auto-GM scheduler; Tier 2 (1,000,000 XPOST) unlocks automation.
- **Sealed-key precedent**: `plugins/agent-connect/src/services/vault.ts` —
  HKDF-SHA256 + AES-256-GCM seal/open for credential storage at rest.
- **Host surfaces**: MCP `POST /api/mcp`, REST, oRPC — `x-api-key` or session;
  `GET /.well-known/mcp.json`. API keys are created by the signed-in owner at
  `/settings/api-keys`.
- **Scheduling today** (browser-only): `ui/src/store/scheduled-posts-store.ts`
  (localStorage) + `ui/src/hooks/use-scheduled-posts-executor.ts` (15s
  `setInterval`, fires through the client submit path). Replaced by 010 v2.

## Design

### 1. Campaign entity + participants (phase 1)

- `campaigns` table (`api/src/db/schema.ts`, text-based like the rest):
  `id` (slug `^[a-z0-9][a-z0-9-]{0,31}$`, primary key),
  `name`, `description`, `actions_json` (the full
  `CampaignPostAction[]` array by reference-value), `owner_user_id`,
  `status` (`active|inactive`), `created_at`, `updated_at`.
- Contract routes under `social.campaigns.*`:
  - `list` — GET `/social/campaigns` (active only) → `{ campaigns: [...] }`
  - `get` — GET `/social/campaigns/{id}`
  - `create` — POST `/social/campaigns` (any authenticated principal; row
    records `ownerUserId = caller`)
  - `update` — PATCH `/social/campaigns/{id}` (owner-only)
  - `remove` — DELETE `/social/campaigns/{id}` (owner-only, soft → inactive)
- `campaign_participants` table: `id`, `campaign_id`, `user_id`, `mode`
  (`manual|auto`), `created_at`, `updated_at`, unique on
  `(campaign_id, user_id)`. Participation routes phase in with join/automate
  UI (phase 5); the table is created in phase 1.

### 2. Owner seed instance (phases 3)

Stays exactly as decided: an external cron agent holding a **function-call key
scoped to `__fastdata_kv` on `social.near`** (cannot move funds). Daily:

1. Post the seed "gm" to NEAR Social directly with its own key.
2. Post the seed to X through the app's API (connectors bridge on the app's
   sponsored key, sponsor ledgering intact) **as the owner's connected
   account** — attribution caveat in Risks.
3. `POST social.campaigns.seedRecord` (new route, owner-gated — same
   ownership rule as campaigns.update) with `{ campaignId, nearPostId?,
   xPostId? }` → row in `campaign_daily_seeds`
   (`campaign_id`, `date`, `near_post_id`, `x_post_id`, `created_at`,
   unique on `(campaign_id, date)`).

Invariant: **no recorded seed ⇒ nothing spawns that day.** Automations, joins,
and manual gms all resolve today's seed for reply threading.

STOP condition: if the owner instance cannot post to X through the connectors
bridge without breaking per-agent attribution (README finding on
`agentId: session.user.id`), pause for the connectors owner's call.

### 3. Reply threading (phase 4, gated by spikes A+B)

Extend `CampaignPostAction` with `replyToSeed: boolean`. The editor's campaign
prefill resolves today's seed (`social.campaigns.seedGet` returns the day's
seed ids; falls back to standalone posting when none) and the submit path
sends parent ids: NEAR Social leg per Spike A's index format; X leg per
Spike B's reply input. `postsMatchingCampaign` is replaced by
participation/activity records once replies flow through the activity ledger.

**Spike A — FastData KV reply format.** Determine the key/value structure a
reply requires (the social DB reply/index convention — likely an extra
`index/*` entry alongside `post/<key>`; verify against near.social's data
model and what `__fastdata_kv` accepts). Deliverable: exact shape, plus
whether relay sponsorship covers the extra entry. Findings appended here:
(tbd).

**Spike B — OutLayer X reply operation.** Determine whether
`X_CONNECTOR_PROJECT`'s bridge accepts reply input (`input: { text, replyTo }`
or an `operation: "reply"`), via the bridge contract and OutLayer docs. If not
supported, fallback: gm posts standalone on X (seed referenced by text) or
X replies route through BYO X credentials via the unused twitter adapter.
Findings appended here: (tbd).

### 4. Automation (phase 5, gated by Spike S below)

- **Spike S** (moved here from 010): user-granted limited-access key for
  `__fastdata_kv` on `social.near` — grant flow from the user's wallet,
  storage sealed in the api DB using the agent-connect vault pattern
  (HKDF + AES-256-GCM over a key derived from a new API secret,
  `API_KEY_VAULT_SECRET`), app-side gas payment when signing. Findings
  appended here.
- Enrollment per campaign: "Automate" opens the configure panel — 
  profile targets (subset of connected accounts), optional daily time
  override (client tz; default after-seed+jitter) — then, if targets include
  NEAR Social, the key-grant step. XPOST Tier 2 gate checked at enrollment.
- A spec is a row in 010 v2's `job_specs` (kind `campaign`,
  content `(campaign_id, action_id)` by reference,
  `schedule: { mode: "daily", after: "seed", jitterSeconds: 60-600 }`).
  Multiple specs per user per campaign are allowed.
- Spawn: on seed record (or on next tick after it), for each active campaign
  spec with today's seed and no run yet today → create `job_runs` with
  `scheduled_for = now + random(60..600s)`, idempotent per `(spec_id, date)`.
- Fire: the shared tick (010 v2) executes runs. X legs via the bridge, app
  key, gate at execution. NEAR legs sign with the sealed key, app pays gas.
- Keys are revocable: user removes the key (`social.automation.revokeKey`)
  or deactivates the spec ⇒ runs stop; no refund of fired posts. If a sealed
  key is revoked upstream (wallet removed the key), runs fail with a
  clear status.

### 5. UI (phases 1-5, incremental)

- Phase 1: `/campaigns` reads `social.campaigns.list` (fallback to the local
  registry on error); editor prefill resolves campaign by id from the merged
  view. Owner CRUD management UI deferred; creation via API until then.
- Phase 5: campaign page gets **Join** (participant row + editor) and
  **Automate** (configure panel → spec creation (+ key grant)), per-campaign
  mode display, participation history.

### 6. Agents and MCP (informational)

Once `social.campaigns.*` routes exist they automatically appear on the host's
OpenAPI/MCP surface — any MCP-capable agent can create/remove/edit campaigns
with an API key. No agent work is required now; when the owner wants
prompt-driven campaign management, they register a key and talk to `/api/mcp`.

## Phases

1. **Phase 1 — campaigns + participants schema, CRUD routes, UI list cutover.**
2. **Phase 2 — Spikes A, B, S** (append findings; STOP for review).
3. **Phase 3 — seed recording route + owner-instance contract** (seed exec
   script lives in the owner's instance; this app only ships the route).
4. **Phase 4 — reply threading** in editor + submit paths.
5. **Phase 5 — join/automate UI, enrollment, sealed keys, spawning.**

## Verification

- `pnpm run typecheck`, `pnpm run test`, `pnpm run lint` per phase.
- Phase 1: CRUD round-trip in a pglite test incl. duplicate-id conflict and
  owner gating; `/campaigns` renders server campaigns with registry fallback.
- Later phases: posting with a campaign prefill threads under the day's seed
  on both platforms; automation spawn is idempotent per spec/day; no seed ⇒
  no spawns; XPOST gate respected at execution.

## Risks

- FastData KV reply shape may not survive; fallback = owner posts the seed in
  the classic near.social post format with its own key and replies use
  `index` entries (Spike A decides).
- X reply through OutLayer may be unsupported; fallback in Spike B.
- Owner attribution (`agentId`) semantics through the connectors bridge.
- API-key principals resolving to `userId` for requireAuthContext is
  framework-owned; if the owner instance's key does not resolve, the seed
  route accepts the owner's session-based key path instead (to verify in
  phase 3).
