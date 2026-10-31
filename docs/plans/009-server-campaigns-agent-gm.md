# Plan 009: Server-side campaigns and the agent-driven daily gm

> **Executor instructions**: This is a design/spec plan — it does not prescribe
> step-by-step edits. Phase 0 spikes must produce written findings (append them
> to this file under each spike) before any implementation phase starts. Run
> every verification command and confirm the expected result before moving on.
> If a STOP condition occurs, stop and report. When done, update the status row
> for this plan in `docs/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c8ffde2..HEAD -- ui/src/lib/campaigns.ts ui/src/lib/near-social-post.ts ui/src/lib/connector-post.ts plugins/connectors/src/index.ts plugins/connectors/src/services/gate-config.ts plugins/twitter/src/adapters/post.ts api/src/db/schema.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L (multi-session)
- **Risk**: MEDIUM (needs platform-format spikes; touches auth + gating)
- **Depends on**: docs/plans/004-campaign-prefilled-editor.md; spikes gate phases 2-3
- **Category**: direction (audit finding DIRECTION-03, product-committed 2026-10-31)
- **Planned at**: commit `c8ffde2`, 2026-10-31

## Product shape (owner-confirmed)

- The gm campaign posts **"gm"** (lowercase in the action text; the campaign
  name stays "GM Campaign"). Shipped separately in `ui/src/lib/campaigns.ts`.
- The campaign owner is an external agent controlled by `crosspost.near` —
  expected to run as a **separate instance** (a Hermes agent configured with a
  prompt, or a small Railway service). The app itself does **not** hold a
  signer for `crosspost.near`.
- Daily rhythm: the agent posts a seed "gm" (once per day, from the owner), and
  every user's campaign gm becomes a **reply to that seed post** — for both
  NEAR Social and X.
- Optional per-user automation: a user can opt in so their gm posts
  automatically each day without opening the editor.

## Why this matters

Campaigns are a hardcoded UI array with no owner, no creation surface, and no
participation record beyond client-side text matching — adding a campaign means
editing `ui/src/lib/campaigns.ts` (see `docs/plans/004`, lines 27-33). The gm
campaign specifically wants a landlord: a daily seed post so participation is a
thread, plus an automation story. The repo already has all the primitives (API
key auth, agent surfaces, OutLayer posting, the connectors Effect-tick
precedent, and the XPOST tier gate); what's missing is (a) a server-side
campaign entity, (b) reply support in both write paths, (c) a seed-poster
acting for the owner.

## Current state

- **Campaign registry**: `ui/src/lib/campaigns.ts:28-46` — hardcoded
  `campaigns: Campaign[]`, `id: "gm"`, action `{ text: "gm", label: "gm" }`,
  destinations `near-social` + `twitter` (both enabled). Helpers:
  `campaignPrefillPosts` (:61), `campaignDestinations` (:67),
  `postsMatchingCampaign` (:74, case-insensitive text match). Zero campaign
  code in `api/src`.
- **NEAR Social write path** (`ui/src/lib/near-social-post.ts`):
  `buildFastDataKvArgs` (:65-67) writes `{ [`post/${Date.now()}`]: { text } }`
  via `FunctionCall` to `__fastdata_kv` on contract `social.near` (:13);
  `postToNearSocial` (:122-176) relays a delegate action through the app
  relayer (mainnet only, checks relayer balance); `postToNearSocialDirect`
  (:210-249) is the wallet-fallback path. **No reply/parent support.**
- **X write path** (`ui/src/lib/connector-post.ts`): `postToX` (:73-86) calls
  `apiClient.connectors.outlayerCall({ agentId, connector, operation: "post",
  input: { text } })`. The contract input is permissive
  (`z.record(z.string(), z.unknown())`, `plugins/connectors/src/contract.ts:326`)
  but the UI only ever sends text. Handled server-side in
  `plugins/connectors/src/index.ts:656-790` (`outlayerCall`, runs
  `enforceXpostGate` at :663, records compute cost). **No reply_to passed.**
- **Unused reply-capable adapter**: `plugins/twitter/src/adapters/post.ts`
  — a full `twitter-api-v2` `PostAdapter` with `reply()` (:106-118) and
  `in_reply_to_tweet_id` plumbing (:309, :344). Currently not part of the gm
  flow (API `SocialService` create/reply/quote are stubs,
  `api/src/social/service.ts:187-206`).
- **No cron infra**; the only server-side periodic pattern is the
  connectors gate-config refresh daemon: `plugins/connectors/src/index.ts:300-325`
  — `Effect.runFork(Effect.repeat(loop, Schedule.spaced("24 hours")))`.
  `docs/TOKENOMICS.md:78-79` reserves this tick pattern for the Auto-GM
  scheduler ("#20, one mechanism, two consumers"); Tier 2 (1,000,000 XPOST)
  unlocks "Auto-GM scheduler, higher caps, multi-destination" (:49).
- **XPOST gate**: `plugins/connectors/src/services/gate-config.ts` (singleton
  row `id='xpost'`); admin routes `xpostGateConfigSet`/`refresh`
  (`plugins/connectors/src/contract.ts:369-413`). Tier 1 currently gates manual
  gm posting on the app key.
- **Agent surfaces** (host): MCP at `POST /api/mcp`, REST/OpenAPI, oRPC at
  `POST /api/rpc/...` — all accept `x-api-key: api_...` (API keys created at
  `/settings/api-keys`) or session cookies; `GET /.well-known/mcp.json` for
  discovery. Agent Connect plugin exists (`plugins/agent-connect`).
- **Scheduling precedent**: see plan 010 — browser-only scheduler today
  (`ui/src/hooks/use-scheduled-posts-executor.ts`); its server-side successor
  is the *same tick* this plan reuses for the daily seed pattern. Build order
  with 010 must be coordinated (one scheduler, two consumers).

## Design

### 1. Campaign entity (server-side)

- New table `campaigns` (Drizzle, `api/src/db/schema.ts`): `id` (text), `name`,
  `description`, `action_text`, `owner_account_id`, `destinations` (jsonb),
  `active` (bool), timestamps. One migration.
- API routes on the social/crosspost contract: `campaigns.list`,
  `campaigns.get`, `campaigns.create`, `campaigns.update`, `campaigns.remove`
  (soft-delete via `active`). Create/update/remove require **owner auth** —
  an API key belonging to the owner's session, not any signed-in user.
- UI consumes `campaigns.list` instead of the hardcoded array; keep
  `ui/src/lib/campaigns.ts` as the type/helper surface and the fallback for
  offline rendering.

### 2. The owner agent (crosspost.near)

Deployment is **outside this app**: a Hermes agent instance or a small Railway
service, configured by the owner with a prompt for the campaign. It talks to
the running app over the public agent surfaces:

1. Authenticate with an API key issued to the owner (session →
   `/settings/api-keys`), optionally speaking MCP (`/api/mcp`) so the pattern
   is drivable by prompt.
2. Once per day (the agent's own cron/schedule — not the app's):
   `campaigns.createDailySeed` (new route, owner-only) → the app returns the
   seed post id(s) after publishing as the owner **via the agent's own
   credentials** for NEAR Social (agent-held key or Agent Connect signing) and
   via the connectors bridge for X (`outlayerCall` with the owner's connected
   agent; the app routes it on the app's sponsored OutLayer key, or the agent
   brings its own OutLayer wallet — both already supported).
3. The app records the seed: `campaign_daily_seeds` table (`campaign_id`,
   `date`, `near_post_id`, `x_post_id`). Replies reference these.

STOP condition: if the owner agent cannot publish to X through the connectors
bridge without breaking the per-agent attribution (see README finding on
`agentId: session.user.id`), pause and get the connectors owner's call.

### 3. Reply threading (two spikes gate this phase)

**Spike A — NEAR Social reply format.** Determine the FastData KV structure a
reply requires (the social DB reply/index convention — likely an extra
`index/reply`-style entry alongside the post entry; verify against
near.social's data model and what `__fastdata_kv` accepts). Deliverable: exact
key/value shape for a reply to a known post key, plus whether the relayer
sponsorship covers the extra index entry. Append findings here.

**Spike B — OutLayer X reply operation.** Determine whether
`X_CONNECTOR_PROJECT`'s bridge accepts a reply-form `input` (e.g.
`input: { text, replyTo: <tweet_id> }` or an `operation: "reply"`). Probe the
bridge's contract via `plugins/connectors` handlers and OutLayer docs. The
unused `plugins/twitter` adapter is the fallback design if the bridge does not
support replies (only for users who connect with their own X API creds —
note the product difference in billing). Append findings here.

Implementation: extend `CampaignPostAction` with `replyToSeed: boolean`; the
editor's campaign prefill resolves today's seed (`campaigns.getDailySeed`) and
the submit path sends parent ids (`near-social`: index entry per Spike A; `x`:
reply input per Spike B). `postsMatchingCampaign` — replace text matching with
seed-thread participation records once replies flow.

### 4. Per-user automation (opt-in)

- follows plan 010's server scheduler; a user opts in per campaign
  (`campaign_auto_join`), and the daily tick queues their gm:
  - X leg: server-side `outlayerCall` (already app-key sponsored; XPOST Tier 2
    gate applies per `docs/TOKENOMICS.md:49`).
  - NEAR Social leg: delegate path needs the user's signature — two
    acceptable mechanisms, decide by spike outcomes: (a) user adds the relayer
    path as a limited-access key (near-kit supports limited access keys) so
    the server can sign `__fastdata_kv` calls for them; (b) NEAR Social leg
    stays browser-handoff (fires next time the user opens the app; the client
    executor already handles due-post pickup).
- UI: a single toggle on the campaign card + an "auto-gm" status row in
  results/history.

## Phases

1. **Phase 1 — Campaign entity + owner CRUD** (no posting changes).
2. **Phase 2 — Spike A + Spike B** (write findings above, then STOP for review).
3. **Phase 3 — Seed posting + reply threading** (gated by phase 2).
4. **Phase 4 — Per-user auto-gm** (co-built with plan 010's scheduler).

## Verification

- `pnpm run typecheck`, `pnpm run test`, `pnpm run lint` after each phase.
- Manual: as owner, create a campaign → list shows it in `/campaigns`;
  posting gm with the campaign prefill threads under the day's seed on both
  platforms; disabled user automation produces no server-side posts.
- Gates: posting without Tier gating changes must still respect
  `enforceXpostGate`.

## Risks

- NEAR Social reply shape may not survive FastData KV-only writes (Spike A) —
  fallback: near.thread seed posted with the classic social post format by the
  owner agent's own key, replies via `index` entries.
- X reply through OutLayer may be unsupported (Spike B) — fallback: post
  standalone gm on X with seed referenced by media/text, or route X replies
  through the user's own credentials when available.
- Owner attribution (`agentId`) semantics through the connectors bridge.
