# Plan 007: Campaign browsing on the leaderboard pattern

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1bfc624..HEAD -- ui/src/routes/_authenticated/campaigns ui/src/routes/_authenticated/leaderboard ui/src/lib/campaigns.ts ui/src/lib/social.ts plugins/crosspost/src/contract.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Requires plan 004 DONE.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: docs/plans/004-campaign-prefilled-editor.md
- **Category**: direction
- **Planned at**: commit `1bfc624`, 2026-10-31

## Why this matters

After plan 004, campaigns flow through the editor but *browsing* campaigns is
still a bare card list (`campaigns/index.tsx` was a 34-line `campaigns.map()`)
with no participation visibility: nobody can see who's posting, how often, or
their own history. The repo already ships everything needed — the leaderboard is
the in-house gold standard for browsable activity (TanStack Table v9 with
pagination + sorting, `validateSearch` filters, date pickers, CSV export), and
the crosspost plugin exposes an activity API (`getLeaderboard`,
`getAccountActivity`, `getAccountPosts`) that no campaign file references today.
This plan reuses both so campaign browsing is additive UI over existing
endpoints, not a new backend.

## Current state

- **Campaign index today** (`ui/src/routes/_authenticated/campaigns/index.tsx`):
  `listCampaigns()` from `ui/src/lib/campaigns.ts` mapped to Link cards — no
  fetch, no filter, no sort, no participation data. After plan 004,
  `/campaigns/$id` redirects into `/editor?campaign=…`.
- **Leaderboard pattern** (`ui/src/routes/_authenticated/leaderboard/index.tsx`,
  590 lines): `validateSearch: (search) =>
  ActivityLeaderboardQuerySchema.parse(search)` (:62-65); TanStack Table v9 with
  `tableFeatures`, `rowPaginationFeature`, `rowSortingFeature`,
  `createPaginatedRowModel`, `createSortedRowModel`, `columnVisibilityFeature`
  (:7-23); `fetchLeaderboard` client helper; date pickers; platform Select
  filter; CSV export via `lib/utils/export-utils`. This is the pattern to copy.
- **Activity API** (`plugins/crosspost/src/contract.ts:129-157`):
  - `getLeaderboard` — `GET /api/activity`, input
    `ActivityLeaderboardQuerySchema` (limit/offset/timeframe/startDate/endDate/platforms),
    output `ActivityLeaderboardResponseSchema` (entries with `signerId`,
    `totalScore`, `totalPosts`, …).
  - `getAccountActivity` — `GET /api/activity/{signerId}`.
  - `getAccountPosts` — `GET /api/activity/{signerId}/posts` → `AccountPost[]`.
- **Existing client helpers** (`ui/src/lib/social.ts`): `fetchSocialLeaderboard`
  (:163), `fetchSocialAccountPosts` (:153), `socialLeaderboardQueryKey` (:72) —
  reuse, don't re-roll.
- **Known API limitation** (shapes Step 2): the activity API has no
  campaign concept and no text filter — "participation in campaign X" can only
  be approximated client-side (e.g. posts whose text matches the campaign's
  `text` field, and the global leaderboard for the campaign's timeframe). The
  server-side-campaigns decision (rejected-for-now in the index README) would
  upgrade this; this plan builds the best honest view on today's data.

## Commands you will need

| Purpose   | Command                            | Expected on success |
|-----------|------------------------------------|---------------------|
| Typecheck | `pnpm run typecheck`               | exit 0 |
| UI tests  | `pnpm --dir ui run test`           | all pass |
| Lint      | `pnpm run lint`                    | exit 0 |

**Never use `bun`** for anything (CI fails on any `bun.lock` artifact).

## Scope

**In scope**:
- `ui/src/routes/_authenticated/campaigns/index.tsx` (rebuild: campaign cards + participation section)
- `ui/src/lib/campaigns.ts` (small additions if needed)
- `ui/src/lib/campaigns.test.ts` (extend)
- `ui/src/lib/social.ts` (only if a missing query-key/helper is genuinely needed — prefer existing)

**Out of scope**:
- `plugins/crosspost/**`, `api/src/**` — no backend changes. If the activity API
  can't express a needed view, that's a STOP, not a plugin edit.
- `ui/src/routes/_authenticated/leaderboard/index.tsx` — read as the exemplar;
  do not modify it.
- New campaigns, campaign editing/creation UI.
- The editor route (plan 004's territory).

## Git workflow

- Branch: `advisor/007-campaign-browsing`
- Commit per step; message style `scope: description`, e.g.
  `ui: campaign participation view on the activity API`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rebuild the campaigns index

Rework `ui/src/routes/_authenticated/campaigns/index.tsx`:
- Keep the route and the card-link structure (cards still Link to
  `/campaigns/$campaignId`, which plan 004 redirects into the editor).
- Enrich each card from the existing `Campaign` data: name, description, and a
  destination badge row (one `Badge` per enabled destination from
  `campaignDestinations(campaign)` — helper added in plan 004, `lib/campaigns.ts`)
  plus the action text in a muted line ("Posts “GM”").
- Semantic classes only (`bg-card`, `text-card-foreground`, `border-primary`,
  `text-muted-foreground`) per AGENTS.md.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 2: "Your activity" section on the campaign page set

Add a participation section to the campaigns index (below the cards):
- A "Your recent posts" list for the signed-in viewer: `useQuery` on
  `fetchSocialAccountPosts(apiClient, nearAccountId)` (helper exists,
  `lib/social.ts:153`) — gated on the near account id (pattern:
  `nearAccountIdQueryOptions` in the editor loader).
- Render posts with `text`, timestamp, and a ✓/✗ indicator for whether the post
  text matches an active campaign's action text (pure helper
  `postsMatchingCampaign(posts, campaign)` in `lib/campaigns.ts` — case-
  insensitive exact match on trimmed text).

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Participant leaderboard scoped to the campaign

Add a "Top participants" table on the campaigns index, built on the leaderboard
pattern (copy the structure from `leaderboard/index.tsx`, do not modify it):
- `useQuery` → `fetchSocialLeaderboard(apiClient, { limit: 10, offset: 0,
  timeframe: "week", ... })` (helper exists, `lib/social.ts:163`).
- TanStack Table v9 with `tableFeatures` + `rowPaginationFeature` +
  `rowSortingFeature` and `createPaginatedRowModel`/`createSortedRowModel` —
  same feature set as the leaderboard route (:7-23).
- Columns: rank, signer (link to `/profile/$accountId` like the leaderboard
  does at :248's link pattern), post count. No CSV export, no platform filter —
  keep it minimal.
- A `validateSearch` on the campaigns index route for `timeframe` (parse with
  the same `TimePeriod` values `ActivityLeaderboardQuerySchema` accepts), so
  the timeframe is shareable.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 4: Full verification

**Verify**: `pnpm --dir ui run test` → all pass (including extended campaigns
tests); `pnpm run typecheck && pnpm run lint` → exit 0.

## Test plan

- `ui/src/lib/campaigns.test.ts` — extend for the new pure helpers:
  `postsMatchingCampaign` (match, no-match, case/whitespace insensitivity, empty
  posts), and the destination-badge data (already covered by plan 004's
  `campaignDestinations`).
- Model: existing `describe("campaigns")` vitest block.
- Manual (operator): open `/campaigns` — cards render with destination badges;
  signed in with posts, "Your recent posts" reflects reality; "Top
  participants" table paginates/sorts.

## Done criteria

- [ ] Campaigns index renders enriched cards + "Your recent posts" + "Top participants" table
- [ ] `grep -n "useTable\|rowPaginationFeature" ui/src/routes/_authenticated/campaigns/index.tsx` → matches (table pattern present)
- [ ] New pure helpers covered in `ui/src/lib/campaigns.test.ts` and passing
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm --dir ui run test` exit 0
- [ ] `leaderboard/index.tsx` unmodified (`git diff --stat` shows it untouched)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows plan 004 has not landed (no `/editor?campaign=…`
  redirect) — this plan's URLs assume it.
- `fetchSocialLeaderboard`/`fetchSocialAccountPosts` error or return shapes
  differ from `lib/social.ts:153-175` (contract drift) — report; do not
  hand-parse a different shape.
- The participation approximation proves misleading in practice (e.g. text
  matching flags unrelated posts) — report; the honest fix is the deferred
  server-side-campaigns decision, not cleverer client-side heuristics.

## Maintenance notes

- If the server-side-campaigns spike (deferred in the index README) lands, this
  plan's client-side text matching and global-leaderboard reuse are the pieces
  to replace first.
- Keep the campaign index's `validateSearch` schema in sync with
  `ActivityLeaderboardQuerySchema`'s timeframe values; a reviewer should check
  both when either changes.
- The header's campaigns entry point (`campaigns-tour.tsx` → `/campaigns`)
  needs no change; its copy stays accurate.
