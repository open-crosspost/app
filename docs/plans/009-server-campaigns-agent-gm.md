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
sends parent ids: NEAR Social leg per Spike A's confirmed reply format
(`reply_to`/`root` + the `reply/...` backlink in the same action); X leg
posts standalone per Spike B (no connector reply support). `postsMatchingCampaign` is replaced by
participation/activity records once replies flow through the activity ledger.

**Spike A — FastData KV reply format.** ✅ **RESOLVED (2026-10-31, no live
probe needed).** The near.social data standard is **social-kv/1 on FastData KV**
(https://near.social/standard.md) — written via `__fastdata_kv` on `social`
(receiver account is `social` — see `near-social-post.ts:13`; `social.near`
aliases the same account and appears in some docs), which is exactly our
existing write path. Replies are first-class:

```json
{
  "post/1759140000500": {
    "text": "Welcome!",
    "reply_to": "alice.near/1759140000000",
    "root": "alice.near/1759140000000"
  },
  "reply/alice.near/1759140000000/1759140000500": {}
}
```

- `reply_to` = `"{parent_account}/{parent_post_id}"`; `root` = thread top
  (the parent's `root`, or the parent itself when it is a top-level post).
- The backlink key `reply/{parent_account}/{parent_post_id}/{post_id}` → `{}`
  MUST be written in the **same action** as the reply post; delete = write
  `null` to **both** keys.
- Post ids are millisecond timestamps (`post/{Date.now()}`), matching our
  existing `buildFastDataKvArgs`.
- Thread reads: `GET api2.near.social/v1/posts/{account}/{post}` +
  `/replies`; reply discovery also via KV prefix
  `reply/{parent_account}/{parent_post_id}/` on
  `POST kv.main.fastnear.com/v0/latest/social`.
- Relay sponsorship: the standard's recommended allowance for a fn-call key
  is ≈0.001 NEAR per ~1KB write; the app relayer already relays `social`
  writes today, and the backlink key adds ~40 bytes — covered.
- Phase 4 implementation notes: compute `root` from the seed (seed posts are
  top-level ⇒ root = the seed itself); post-key uniqueness via `Date.now()` is
  caller-side — automation spawn jitter makes collisions unlikely; keep
  `postsMatchingCampaign` until replies flow through the activity ledger.

**Spike B — OutLayer X reply operation.** ❌ **NOT SUPPORTED** (definitive —
the X connector's source and signed manifest). The X connector
(`connectors.outlayer.near/x`) exposes `status, me, post, confirm, task_*` —
no reply operation; `post` accepts only `{ text }`; unknown fields are
silently dropped by serde and unknown operations are refused pre-run
(cost-free). Evidence: sibling repo `../outlayer.opencrosspost.com`
(`x/src/main.rs:31-60` — the operation catalog and `Input` struct;
`x/src/x_api.rs:75-76` — `tweet()` posts `{ "text": text }` to `/2/tweets`
without a reply member), plus the signed manifest in the deployed wasm.
The bridge itself is **not** the blocker: `outlayerCall`'s input is an
untyped record passed verbatim (`plugins/connectors/src/index.ts:773`), the
XPOST gate and sponsor ledger are operation-agnostic, and the payment-key
resolution chain would flow a reply for free — only the connector's
`Input` struct + `x_api::tweet` body lack the fields.
**Upstream fix (for sponsored replies later):** in
`../outlayer.opencrosspost.com`, add `reply_to` (or pass-through
`in_reply_to_tweet_id`) to the `post` operation's `Input` and the
`x_api::tweet` body, bump and redeploy the wasm, re-curate. Zero bridge
changes needed. **Tracked upstream:
https://github.com/open-crosspost/connectors/issues/1** — pass `reply_to`
through `postToX` in this app once it ships. OAuth scopes currently
requested already include `tweet.write` (`api/src/social/x-connect.ts:7-12`),
so only the connector needs the change. **Adopted fallback for the
foreseeable future: X gms post standalone (seed referenced by text); if BYO
X credentials config ships, the unused
`plugins/twitter/src/adapters/post.ts:106 reply()` adapter is ready-made for
threading under X credentials the user owns.**

**Spike S — sealed user function-call key.** ✅ **FEASIBLE, three
independent precedents in-repo.** Recommended design:

1. **Grant (wallet-approved AddKey)**: server onboarding "automation key"
   flow — user configures automation (+ has NEAR targets) ⇒ UI shows the
   app-generated public key and the user approves a wallet
   `signAndSendTransaction` with an `AddKey` action via the existing
   NearConnector session (`ui/src/lib/near-social-post.ts:225` uses this
   exact path; `@hot-labs/near-connect` `AddKeyAction` supports
   `permission: { receiverId, allowance, methodNames }`).
   Implementation shape: `{ type: "AddKey", params: { publicKey,
   accessKey: { permission: { receiverId: "social", methodNames:
   ["__fastdata_kv"], allowance: "250000000000000000000000000" }/*0.25N*/ } } }`.
   (near-kit `TransactionBuilder.addKey(publicKey, { type: "functionCall",
   receiverId, methodNames, allowance })` is the equivalent for the
   `getNearClient()` path.)
2. **Server-held private key, sealed**: generate an ed25519 keypair
   server-side at grant time; seal the private portion with the
   agent-connect vault pattern (HKDF-SHA256 + AES-256-GCM,
   `plugins/agent-connect/src/services/vault.ts`) derived from a new api
   secret `API_KEY_VAULT_SECRET`; store `{ accountId, publicKey,
   sealedKey, createdAt }` in an `automation_keys` table. Better-near-auth's
   own relayer-key storage (`dist/index.js:997-1017` — keypair encrypted
   with `BETTER_AUTH_SECRET`, committed before the hosted send) is the
   working precedent for lifecycle.
3. **Execution**: the tick signs a `SignedDelegateAction` (senderId = user's
   account) with the opened key and relays via the existing better-near-auth
   relayer (`POST /api/auth/near/relay`, already relaying `social` writes
   today — it verifies only `senderId` ownership, so fn-call-key-signed
   delegates work unchanged) — OR self-relays gas with an app wallet key
   (the `OUTLAYER_APP_WALLET_KEY` plumbing precedent) as fallback.
   Implementation-time check: the relayer resolves the session's linked NEAR
   account; cron-driven calls through an `x-api-key` session must satisfy
   that lookup — verify in phase 5.
4. **Scope**: receiver `social` (the account this repo already posts to),
   methodNames `["__fastdata_kv"]` — this is literally the configuration
   social-kv/1 recommends (§Recommended key). `__fastdata_fastfs` deliberately
   excluded (we never write files). Allowance 0.25 NEAR ≈ 250k+ gms of
   headroom, hard-capped, zero fund access.
5. **Revoke**: UI button ⇒ wallet `DeleteKey` action (near-connect supports
   it) + row deletion; upstream-expiry detection: signing failures with
   `access key not found` ⇒ mark automation spec `paused` + tell the user.

### 4. Automation (phase 5, gated by Spike S — ✅ feasible, above)

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
   ✅ DONE (commit 327661a).
2. **Phase 2 — Spikes A, B, S.** ✅ DONE (findings above, 2026-10-31).
   A: confirmed first-class reply support in social-kv/1. B: confirmed NOT
   supported upstream — X gms post standalone until the connector gains a
   reply field. S: feasible with the AddKey-vault-relayer design above.
3. **Phase 3 — seed recording route + owner-instance contract.**
   ✅ DONE (2026-11-01): `campaign_daily_seeds` table;
   `social.campaigns.seedRecord` (owner-gated upsert — Legs merge across
   calls: record the NEAR leg and the X leg independently; last write of a
   leg wins) and `social.campaigns.seedToday` (read today's seed, nullable —
   the editor prefill and the phase-5 spawn gate consume this).

   **Owner instance contract** (script lives on the owner's Railway/Hermes
   instance; app holds no crosspost.near key):

   1. Daily cron fires at the configured seed time.
   2. NEAR leg: post `gm` to NEAR Social directly with the instance's own
      fn-call key (`__fastdata_kv` on `social`, `post/{Date.now()}: {text}`)
      — remember the post id (the timestamp).
   3. NEAR record: `POST /api/social/campaigns/seed` with
      `x-api-key: <owner's key from /settings/api-keys>` and
      `{"campaignId":"gm","nearPostId":"<post-key-ts>"}` → the seed row is
      created (server stamps UTC date).
   4. X leg: post through the bridge-sponsored key —
      `POST /api/outlayer/call` (connectors plugin) with
      `{"agentId":"<owner session id>","connector":"connectors.outlayer.near/x",
      "operation":"post","input":{"text":"gm"}}` → output carries `tweet_id`.
   5. X record: `POST /api/social/campaigns/seed` with
      `{"campaignId":"gm","xPostId":"<tweet_id>"}` (same day ⇒ merges into
      the same row; both legs now present).
   6. Read: `GET /api/social/campaigns/gm/seed` →
      `{ "seed": { ..., "nearPostId": "…", "xPostId": "…" } | "seed": null }`.

   Invariant: until a seed row exists for today, nothing spawns (phase 5).
4. **Phase 4 — reply threading (NEAR Social leg only)** in editor + submit
   paths per Spike A; X stays standalone (upstream reply ticket in flight:
   open-crosspost/connectors#1 — owner confirmed `reply_to` will land; when
   it does, pass it through `postToX` and record the reply-side tweet ids).
5. **Phase 5 — join/automate UI, enrollment, sealed keys, spawning.**

## Verification

- `pnpm run typecheck`, `pnpm run test`, `pnpm run lint` per phase.
- Phase 1: CRUD round-trip in a pglite test incl. duplicate-id conflict and
  owner gating; `/campaigns` renders server campaigns with registry fallback. ✅
- Later phases: NEAR Social campaign gms thread under the day's seed
  (`reply_to` + backlink written in the same action); automation spawn is
  idempotent per spec/day; no seed ⇒ no spawns; XPOST gate respected at
  execution.

## Risks

- ~~FastData KV reply shape may not survive~~ — resolved: first-class replies
  (Spike A).
- ~~X reply through OutLayer may be unsupported~~ — confirmed unsupported;
  adopted standalone-X fallback (Spike B). Sponsored X replies remain a
  small upstream connector change if ever wanted.
- Owner attribution (`agentId`) semantics through the connectors bridge.
- API-key principals resolving to `userId` for requireAuthContext is
  framework-owned; if the owner instance's key does not resolve, the seed
  route accepts the owner's session-based key path instead (to verify in
  phase 3).
