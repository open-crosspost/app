# Plan 003: Rewire the editor's X submit onto the connector bridge

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1bfc624..HEAD -- ui/src/hooks/use-submit-post.tsx ui/src/routes/_authenticated/campaigns/\$campaignId.tsx ui/src/config.ts plugins/connectors/src/contract.ts api/src/social/service.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but unblocks plan 004)
- **Category**: bug / migration
- **Planned at**: commit `1bfc624`, 2026-10-31

## Why this matters

The editor — the app's flagship surface — can currently only publish to NEAR
Social. Its non-NEAR submit path calls `social.posts.create/reply/quote`, which
the API answers with a guaranteed `PLATFORM_UNAVAILABLE` failure (the direct
platform plugins were deliberately retired in commit `1c5ff98`). Meanwhile the
GM campaign page has a *working* X posting path through the metered connectors
bridge. Users composing in the editor with an X account selected hit "Post" and
get a guaranteed failure. This plan extracts the campaign's working bridge call
into a shared module and routes the editor's X posts through it, restoring a
working publish path and unblocking editor/campaign parity (plan 004).

## Current state

- `api/src/social/service.ts:187-207` — `createPost`, `replyToPost`,
  `quotePost`, `deletePost` all unconditionally return
  `createUnsupportedPostResult(...)` → every target fails.
- `ui/src/hooks/use-submit-post.tsx:170-217` — the `otherAccounts` leg builds a
  `CreatePostRequest` and calls `apiClient.social.posts.create` (:211) /
  `.reply` (:190) / `.quote` (:204). Result aggregation into
  `MultiStatusData` + `submission-results-store` + `/results` navigation works
  and must be preserved (lines 219-378).
- Working reference implementation —
  `ui/src/routes/_authenticated/campaigns/$campaignId.tsx:22-34`:

```tsx
async function postGmToX(apiClient: ApiClient, agentId: string, text: string) {
  const call = await apiClient.connectors.outlayerCall({
    agentId,
    connector: X_CONNECTOR_PROJECT,
    operation: "post",
    input: { text },
  });
  const output = call.output as { username?: string } | null;
  if (call.status !== "completed" || !output || !output.username) {
    throw new Error(call.error || "The connector did not post the GM.");
  }
  return { accountId: output.username, callId: call.callId };
}
```

- `ui/src/config.ts` — `X_CONNECTOR_PROJECT` is env-configured
  (`ImportMetaEnv.X_CONNECTOR_PROJECT`), defaulting to the preview project
  `connectors.outlayer.near/x` until OutLayer curation activates the bare
  namespace.
- `plugins/connectors/src/contract.ts:249+` — `outlayerCall` input:
  `{ walletId?, agentId (min 1), connector, operation, input: record<string, unknown> }`;
  output `{ callId, status, output: record | null, ... }`. Each call is metered
  against the wallet's payment-key balance.
- The editor route passes `session.user.id` as `agentId` in the campaign flow —
  keep that same identity source for the editor path (consistency with the
  working campaign flow; a deeper identity question is explicitly out of scope).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0 |
| Typecheck | `pnpm run typecheck`     | exit 0 |
| UI tests  | `pnpm --dir ui run test` | all pass |
| Lint      | `pnpm run lint`          | exit 0 |

**Never use `bun`** for anything (CI fails on any `bun.lock` artifact).

## Scope

**In scope**:
- `ui/src/lib/connector-post.ts` (create)
- `ui/src/hooks/use-submit-post.tsx`
- `ui/src/routes/_authenticated/campaigns/$campaignId.tsx` (use the shared helper)
- `ui/src/lib/connector-post.test.ts` (create, if a test earns its keep — see Test plan)

**Out of scope**:
- `plugins/connectors/**` and `api/src/**` — no backend changes.
- Reply/quote flows for non-NEAR platforms — no working backend exists for them;
  see Step 3 for the honest-error treatment. Do not attempt to build reply/quote
  on the bridge.
- Campaign-screen retirement — plan 004.
- The `agentId` identity question (audit finding CORRECTNESS-04) — investigate-only.

## Git workflow

- Branch: `advisor/003-editor-x-connector`
- Commit per step; message style `scope: description`, e.g.
  `ui: route editor X posts through the connectors bridge`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract the shared bridge helper

Create `ui/src/lib/connector-post.ts` with a generalized version of
`postGmToX` (no "GM" copy, `X_CONNECTOR_PROJECT` from `@/config`):

```ts
import { X_CONNECTOR_PROJECT } from "@/config";
import type { ApiClient } from "@/app";

export type ConnectorPostResult = { accountId: string; callId: string };

export async function postToX(
  apiClient: ApiClient,
  agentId: string,
  text: string,
): Promise<ConnectorPostResult> {
  const call = await apiClient.connectors.outlayerCall({
    agentId,
    connector: X_CONNECTOR_PROJECT,
    operation: "post",
    input: { text },
  });
  const output = call.output as { username?: string } | null;
  if (call.status !== "completed" || !output || !output.username) {
    throw new Error(call.error || "The connector did not publish the post.");
  }
  return { accountId: output.username, callId: call.callId };
}
```

Then update `$campaignId.tsx` to import `postToX` instead of defining
`postGmToX` (call it with the same arguments; the return shape is compatible —
`result.callId` is used at :96).

**Verify**: `pnpm run typecheck` → exit 0. `grep -n "postGmToX" ui/src -r` → no matches.

### Step 2: Route the editor's regular-post X leg through the helper

In `ui/src/hooks/use-submit-post.tsx`, inside the `otherAccounts` branch
(lines 170-217): split the targets by platform. For regular posts
(`postType === "post"`), accounts with `platform === "Twitter"` go through
`postToX(apiClient, agentId, joinedText)` where `joinedText =
nonEmptyPosts.map((p) => p.text).join("\n\n")` and
`agentId = session.user.id` (guard: the `isSignedIn` check at :58 already
guarantees `session.user` exists). Per-account, translate the outcome into the
existing `finalResults` / `finalErrors` shape (a `SuccessDetail` with
`details: { platform, userId, message }` on success; an `ErrorDetail` with
`code: ApiErrorCode.PLATFORM_ERROR` on throw) — mirroring how the NEAR Social
leg is folded in at :277-301. Any remaining non-NEAR, non-Twitter accounts
(currently none reachable) stay on the existing `social.posts.*` path.

Media constraint: the bridge input is text-only (`input: { text }`). If any
`nonEmptyPosts` item carries media, do **not** call the bridge — push an
`ErrorDetail` (`code: ApiErrorCode.PLATFORM_ERROR`, message "Media is not yet
supported for X posts") so the user gets an honest partial-result instead of a
silent drop.

**Verify**: `pnpm run typecheck` → exit 0.

### Step 3: Honest errors for reply/quote on non-NEAR platforms

The `reply`/`quote` branches (:181-208) still call the stubbed
`social.posts.*` and always fail. Leave the call sites but prepend, for
non-NEAR-Social accounts, a clear `ErrorDetail` message ("Replies and quotes are
not yet supported for X — regular posts only") by short-circuiting into the
error path instead of the doomed API call. Keep NEAR-Social filtering behavior
(:125-131) exactly as is.

**Verify**: `pnpm run typecheck` → exit 0; `pnpm run lint` → exit 0.

### Step 4: Full verification

**Verify**: `pnpm --dir ui run test` → all pass. Then
`pnpm run typecheck && pnpm run lint` → exit 0.

## Test plan

- Extract the outcome-translation for a bridge result into a small pure function
  in `connector-post.ts` (e.g. `toSuccessDetail(result, account)` /
  `toErrorDetail(error, account)`) and unit-test those in
  `ui/src/lib/connector-post.test.ts` — model the file after
  `ui/src/lib/campaigns.test.ts` (vitest `describe/it/expect`).
- Cases: success mapping; `call.status !== "completed"` → error; `output` null →
  error; media-present post → unsupported error detail.
- Manual (operator): compose in the editor with an X account selected and post —
  expect either success with the connector metering a call, or an honest error
  detail; then check `/results` shows the outcome.

## Done criteria

- [ ] `grep -rn "social.posts.create" ui/src/hooks/use-submit-post.tsx` → no matches for the Twitter regular-post path (only the reply/quote/legacy-non-Twitter remnants may remain, per Step 3)
- [ ] `grep -n "postGmToX" -r ui/src` → no matches (helper is shared)
- [ ] `pnpm run typecheck`, `pnpm run lint` exit 0
- [ ] `pnpm --dir ui run test` exits 0, including the new `connector-post.test.ts`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows `plugins/connectors/src/contract.ts` changed the
  `outlayerCall` input/output shape.
- The `outlayerCall` client type rejects the `{ text }` input or the response
  lacks `callId`/`status`/`output` fields (contract drift).
- A second non-NEAR, non-Twitter platform becomes selectable in the editor —
  the routing rule in Step 2 needs a human decision before extending.
- The API client type for `apiClient.connectors.outlayerCall` is not reachable
  from `useApiClient()` (plugin composition changed).

## Maintenance notes

- When OutLayer curation activates the bare `connectors.outlayer.near/x`
  namespace, `X_CONNECTOR_PROJECT`'s env default changes — no code change needed.
- When the connectors bridge gains reply/quote/media operations, revisit Step 3's
  short-circuits and the media constraint in Step 2.
- Plan 004 builds directly on this shared helper; keep its signature stable.
- A reviewer should scrutinize: metering semantics (every editor X post now costs
  a metered call), and that `session.user.id` is the intended `agentId`.
