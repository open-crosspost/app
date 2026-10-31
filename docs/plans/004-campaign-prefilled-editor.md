# Plan 004: Campaign = prefilled editor

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1bfc624..HEAD -- ui/src/routes/_authenticated/editor ui/src/routes/_authenticated/campaigns ui/src/components/campaign-screen.tsx ui/src/lib/campaigns.ts ui/src/lib/connector-post.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. This plan requires plan 003 to be
> DONE — verify `ui/src/lib/connector-post.ts` exists.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: docs/plans/003-editor-x-connector-submit.md
- **Category**: direction / tech-debt
- **Planned at**: commit `1bfc624`, 2026-10-31

## Why this matters

A campaign today is a hardcoded array entry (`ui/src/lib/campaigns.ts:24-42`)
rendered through a bespoke 259-line composer (`CampaignPostForm`) that
reimplements — worse than — what the editor already does: destination picking,
account availability, connect CTAs, submission, and result display, all in a
parallel stack with divergent data sources. Users get two inconsistent posting
UXs for the same job, and every new campaign means editing a UI constant plus a
bespoke form. The fix the maintainers asked for: **a campaign is the editor,
prefilled.** The seam already exists — the editor loads drafts via
`initEditorState` / `posts_replaced` — so this is a re-route, not a rebuild.

## Current state

- **Prefill seam.** `ui/src/routes/_authenticated/editor/-editor-state.ts:45-56`:
  `initEditorState(autosavedPosts)` seeds `posts`; the `posts_replaced` action
  (:76-77) swaps content. `ui/src/routes/_authenticated/editor/index.tsx:186-222`
  already exercises both for draft loading (`handleLoadDraft` →
  `handlePostsReplaced`). `EditorContent` is `{ text: string; media: EditorMedia[] }`
  (`ui/src/store/drafts-store.ts`).
- **Editor route has no search-param validation** — only
  `leaderboard/index.tsx` (via `ActivityLeaderboardQuerySchema.parse`) and
  `callback/x.tsx` use `validateSearch` in this repo; copy that pattern.
- **Platform selection** lives in a zustand store keyed by account **userId**
  (`ui/src/store/platform-accounts-store.ts:13-54` — `selectAccount(userId)`,
  persisted to localStorage under `crosspost-selected-accounts`). Campaign
  destinations are **platform ids** (`"near-social" | "twitter"`), so preselect
  means resolving platform → loaded accounts → `selectAccount(account.userId)`.
- **Campaign surface today**:
  - `ui/src/routes/_authenticated/campaigns/index.tsx` (34 lines) — raw
    `campaigns.map()` to Link cards.
  - `ui/src/routes/_authenticated/campaigns/$campaignId.tsx` (113 lines) —
    three hand-rolled account queries (:42-57, duplicating the exported
    `nearAccountIdQueryOptions` / `nearSocialAccountQueryOptions` /
    `connectedAccountsQueryOptions` helpers from `ui/src/lib/social.ts:89-115`)
    + `onPost` with `postGmToX` (now the shared `postToX` after plan 003).
  - `ui/src/components/campaign-screen.tsx` (259 lines) — `CampaignPostForm`
    bespoke composer; `CampaignScreen` wrapper.
  - `ui/src/lib/campaigns.ts` — `Campaign` type: `{ id, name, description,
    actions: [{ id, label, kind: "post", text, destinations: [{ id, label, enabled }] }] }`.
- **Submit path** after plan 003: `useSubmitPost` handles NEAR Social
  (client-side wallet) and Twitter (connector bridge) in one MultiStatus
  aggregation; results land in `submission-results-store` and `/results`.

## Commands you will need

| Purpose   | Command                            | Expected on success |
|-----------|------------------------------------|---------------------|
| Typecheck | `pnpm run typecheck`               | exit 0 |
| UI tests  | `pnpm --dir ui run test`           | all pass |
| Lint      | `pnpm run lint`                    | exit 0 |

**Never use `bun`** for anything (CI fails on any `bun.lock` artifact).

## Scope

**In scope**:
- `ui/src/routes/_authenticated/editor/index.tsx` (validateSearch + prefill)
- `ui/src/routes/_authenticated/editor/-editor-state.ts` (only if a prefill helper belongs there)
- `ui/src/lib/campaigns.ts` (add a pure prefill-mapping helper)
- `ui/src/lib/campaigns.test.ts` (extend)
- `ui/src/routes/_authenticated/campaigns/index.tsx` (cards link to campaign ids; keep URLs stable)
- `ui/src/routes/_authenticated/campaigns/$campaignId.tsx` (becomes a redirect)
- `ui/src/components/campaign-screen.tsx` (delete)
- `docs/plans/README.md` (status row)

**Out of scope**:
- `ui/src/components/campaigns-tour.tsx` — keep working as is (it links to `/campaigns`).
- Any backend/plugin change; campaigns remain a UI-defined registry until the
  server-side-campaigns decision (rejected-for-now in the index).
- New campaign entries beyond the existing GM campaign.
- Scheduled-posts/drafts interplay beyond what prefill touches.

## Git workflow

- Branch: `advisor/004-campaign-prefilled-editor`
- Commit per step; message style `scope: description`, e.g.
  `ui: deep-link campaigns into a prefilled editor session`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pure prefill helper + tests

In `ui/src/lib/campaigns.ts` add (imports: `type { EditorContent } from "@/store/drafts-store"`):

```ts
export function campaignPrefillPosts(campaign: Campaign): EditorContent[] {
  return campaign.actions
    .filter((action) => action.kind === "post")
    .map((action) => ({ text: action.text, media: [] }));
}

export function campaignDestinations(campaign: Campaign): CampaignDestinationId[] {
  return campaign.actions
    .flatMap((action) => action.destinations)
    .filter((destination) => destination.enabled)
    .map((destination) => destination.id);
}
```

Extend `ui/src/lib/campaigns.test.ts` (model the existing cases): prefill text
matches the action text; destinations list only enabled ones; empty-actions
campaign → empty prefill.

**Verify**: `pnpm --dir ui run test -- campaigns` → all pass.

### Step 2: Editor route accepts a campaign search param

In `ui/src/routes/_authenticated/editor/index.tsx`, add to the route definition
(pattern: `leaderboard/index.tsx` `validateSearch`):

```ts
validateSearch: (search) => {
  const campaign = typeof search.campaign === "string" ? search.campaign : undefined;
  return { campaign };
},
```

(`getCampaign` validates the id later; a plain string param keeps the route
loadable for any value.)

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Prefill and preselect in the editor component

In `EditorPage`:
1. Read the param: `const { campaign } = Route.useSearch();` and resolve
   `const campaign_ = campaign ? getCampaign(campaign) : undefined;`
2. Prefill **after** mount, once, so it wins over any autosave restore: a
   `useEffect` keyed on `[campaign_]` that, when `campaign_` exists, dispatches
   `{ type: "posts_replaced", posts: campaignPrefillPosts(campaign_) }` and
   `clearAutoSave()`.
3. Preselect accounts: a second `useEffect` keyed on `[campaign_, allAccounts]`
   that, when `campaign_` exists and `selectedAccountIds.length === 0`, calls
   `selectAccount(account.userId)` for every `allAccounts` entry whose platform
   matches a `campaignDestinations(campaign_)` id (map `"twitter"` →
   `Platform.TWITTER` / the `"Twitter"` PlatformName used in
   `use-submit-post.tsx:136`; `"near-social"` → the `"Near Social"` platform
   name). Resolve the platform-name mapping in one place (a small const in
   `lib/campaigns.ts`) rather than inline string checks.
4. Render a small campaign banner above the composer when `campaign_` is set:
   campaign name + description + a clear-"✕" that navigates to `/editor` without
   the param (`useNavigate`).

**Verify**: `pnpm run typecheck` → exit 0. `pnpm run lint` → exit 0.

### Step 4: Convert the campaign detail route into a redirect

Rewrite `ui/src/routes/_authenticated/campaigns/$campaignId.tsx` to a redirect
route (pattern: TanStack `beforeLoad` + `throw redirect(...)`):

```ts
export const Route = createFileRoute("/_authenticated/campaigns/\$campaignId")({
  beforeLoad: ({ params }) => {
    if (!getCampaign(params.campaignId)) {
      throw redirect({ to: "/campaigns" });
    }
    throw redirect({
      to: "/editor",
      search: { campaign: params.campaignId },
    });
  },
});
```

(No component needed. Unknown ids go to the campaigns index — the generic
not-found copy from plan 002 is subsumed.)

**Verify**: `pnpm run typecheck` → exit 0. `grep -n "CampaignScreen" -r ui/src/routes` → no matches.

### Step 5: Retire the bespoke composer

Delete `ui/src/components/campaign-screen.tsx`. Confirm nothing else imports it.

**Verify**: `grep -rn "campaign-screen\|CampaignScreen" ui/src` → no matches. `pnpm run typecheck` → exit 0.

### Step 6: Full verification

**Verify**: `pnpm --dir ui run test` → all pass; `pnpm run typecheck && pnpm run lint` → exit 0.

## Test plan

- `ui/src/lib/campaigns.test.ts` — extend with the Step 1 cases (happy path,
  disabled-destination filtering, empty actions). Model: existing
  `describe("campaigns")` block.
- Manual (operator): click Campaigns → GM card → lands in `/editor?campaign=gm`
  with "GM" prefilled and the NEAR Social account preselected; posting lands in
  `/results` like a normal editor post. Autosaved content is replaced by the
  prefill, not merged.

## Done criteria

- [ ] `/campaigns/gm` redirects to `/editor?campaign=gm` (redirect route, no page component)
- [ ] Editor with `?campaign=gm` shows the prefill text and preselected accounts without manual steps
- [ ] `grep -rn "CampaignScreen\|campaign-screen" ui/src` → no matches
- [ ] `grep -n "validateSearch" ui/src/routes/_authenticated/editor/index.tsx` → 1 match
- [ ] `pnpm --dir ui run test` exits 0 including new campaigns tests
- [ ] `pnpm run typecheck`, `pnpm run lint` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `ui/src/lib/connector-post.ts` does not exist (plan 003 not landed — blocked).
- The editor autosave restore and campaign prefill interact in a way Step 3's
  ordering doesn't cover (e.g. prefill loops on re-render) — report the
  observed effect instead of piling on effects.
- `Route.useSearch()` typing rejects the new param (route-tree regeneration
  stale — try restarting the dev server / rerunning `pnpm run types:gen` once;
  if still broken, report).
- Campaign data model needs more than `{ text, media }` prefill (e.g. per-
  destination texts) — that's a schema decision, report back.

## Maintenance notes

- New campaigns are now just new entries in `lib/campaigns.ts` — no new UI. The
  entry's `text` is posted verbatim; keep the type honest if that ever changes.
- The platform-id → PlatformName mapping added in Step 3 is the one place to
  update when a third destination (e.g. Farcaster) becomes live — and only after
  its submit path exists (plan 003 pattern).
- The dead `kind: "post"` discriminator can be dropped when a second kind is
  designed; do not drop it in this plan (tests reference it).
- Reviewers should scrutinize the prefill-vs-autosave ordering and that account
  preselection never *adds* accounts the user explicitly deselected (the
  `selectedAccountIds.length === 0` guard).
