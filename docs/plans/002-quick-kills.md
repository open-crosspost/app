# Plan 002: Quick kills — dead files, GM 404, callId label, stale docs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1bfc624..HEAD -- ui/src/components/ui/select.jsx ui/src/components/ui/tooltip.jsx ui/src/routes/_authenticated/campaigns ui/src/components/campaign-screen.tsx ui/src/components/theme-toggle.tsx LLM.txt`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt (with one bug fix)
- **Planned at**: commit `1bfc624`, 2026-10-31

## Why this matters

Five small, independently-verifiable defects and dead-code sites. Each is cheap,
each is a trap or a lie today: two dead `.jsx` component copies that would
silently shadow real components under a resolution-order change, a 404 page that
claims to be the GM campaign for *any* unknown id, a connector `callId` displayed
to users as a blockchain transaction hash, a dead theme-toggle component, and
documentation naming CSS tokens that don't exist.

## Current state

**a) Dead duplicate shadcn components.** `ui/src/components/ui/select.jsx` and
`ui/src/components/ui/tooltip.jsx` exist alongside `select.tsx` / `tooltip.tsx`.
All imports are extensionless (`@/components/ui/select`), and rsbuild resolves
`.tsx` first — so the `.jsx` copies never load. `ui/tsconfig.json` only includes
`**/*.ts` / `**/*.tsx`, so the `.jsx` files are never typechecked. They have
drifted: `tooltip.jsx:18` has a lowercase, invalid `delayduration={100}` prop and
`:20` a hardcoded `text-gray-800` — proof of staleness.

**b) Misleading 404.** `ui/src/routes/_authenticated/campaigns/$campaignId.tsx:59-74`:
when `getCampaign(campaignId)` returns undefined, the page renders hardcoded
`<h1>GM Campaign</h1>` and "GM Campaign – Post GM from your account." — for any
unknown id.

**c) False transaction provenance.** Same file, lines 92-97:

```tsx
const result = await postGmToX(apiClient, session.user.id, input.text);
return {
  destination: "twitter" as const,
  accountId: result.accountId,
  txHash: result.callId,
};
```

`callId` is a connector-call id (`plugins/connectors/src/contract.ts` output
schema: `{ callId, status, output, ... }`), not a transaction. It is rendered at
`ui/src/components/campaign-screen.tsx:197` as
`` ` (tx ${outcome.txHash.slice(0, 8)}…)` ``. The `CampaignPostResult` type
(`campaign-screen.tsx:8-12`) has `txHash?: string` used for both destinations —
but only the near-social destination returns a real tx hash.

**d) Dead component.** `ui/src/components/theme-toggle.tsx` — `ThemeToggle` is
imported by nothing; `header.tsx:15-17` implements its own toggle inline.

**e) Stale docs.** `LLM.txt`, section "UI Styling Guidelines" → "Custom Brand
Colors", documents `--near-green: #00ec97` (+ `-hover`, `-light`), `--near-blue`,
`--near-purple` as "Available as CSS variables". Grep of `ui/src` finds zero
occurrences; `styles.css` defines none of them.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm run typecheck`     | exit 0, no errors |
| UI tests  | `pnpm --dir ui run test` | all pass |
| Lint      | `pnpm run lint`          | exit 0 |

**Never use `bun`** for anything (CI fails on any `bun.lock` artifact).

## Scope

**In scope**:
- `ui/src/components/ui/select.jsx` (delete)
- `ui/src/components/ui/tooltip.jsx` (delete)
- `ui/src/routes/_authenticated/campaigns/$campaignId.tsx`
- `ui/src/components/campaign-screen.tsx`
- `ui/src/components/theme-toggle.tsx` (delete)
- `LLM.txt` (remove one section)

**Out of scope**:
- `ui/src/lib/campaigns.ts`, `ui/src/components/campaigns-tour.tsx` — plan 004
  restructures the campaign surface; do not pre-empt it.
- Any styling work (plans 005/006).
- Adding the `--near-*` tokens for real — the maintainers chose deletion; revisit
  only if they ask for brand tokens.

## Git workflow

- Branch: `advisor/002-quick-kills`
- One commit per lettered fix; message style `scope: description`, e.g.
  `ui: delete dead .jsx duplicates of select/tooltip`, `docs: remove nonexistent --near-* tokens from LLM.txt`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1 (a): Delete the dead `.jsx` copies

Delete `ui/src/components/ui/select.jsx` and `ui/src/components/ui/tooltip.jsx`.

**Verify**: `pnpm run typecheck` → exit 0 (proves the `.tsx` files satisfy all imports).

### Step 2 (b): Generic not-found state for unknown campaign ids

In `ui/src/routes/_authenticated/campaigns/$campaignId.tsx`, replace the body of
the `if (!campaign) { ... }` block (lines 59-74) with a generic not-found state —
keep the `BackButton` and the back `Link`, drop every GM-specific string:

```tsx
if (!campaign) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 border-b pb-4">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1 className="text-2xl font-bold">Campaign not found</h1>
        <p className="text-muted-foreground">
          The campaign “{campaignId}” doesn’t exist or has ended.
        </p>
      </div>
      <Button asChild>
        <Link to="/campaigns">Back to campaigns</Link>
      </Button>
    </div>
  );
}
```

**Verify**: `grep -n "GM Campaign" ui/src/routes/_authenticated/campaigns/\$campaignId.tsx` → no matches.

### Step 3 (c): Label the connector reference honestly

1. In `ui/src/components/campaign-screen.tsx`, rename the `CampaignPostResult`
   field and the success-outcome field from `txHash` to `reference` (type stays
   `string`, optional).
2. In `$campaignId.tsx:96`, return `reference: result.callId` for the twitter
   destination; the near-social destination returns `reference: result.txHash`.
3. In `campaign-screen.tsx` (the success render, line ~197), label by
   destination:

```tsx
{outcome.reference
  ? outcome.destination === "twitter"
    ? ` (ref ${outcome.reference.slice(0, 8)}…)`
    : ` (tx ${outcome.reference.slice(0, 8)}…)`
  : ""}
```

**Verify**: `grep -rn "txHash" ui/src/components/campaign-screen.tsx ui/src/routes/_authenticated/campaigns/\$campaignId.tsx` → no matches.

### Step 4 (d): Delete the dead theme toggle

Delete `ui/src/components/theme-toggle.tsx`.

**Verify**: `grep -rn "theme-toggle\|ThemeToggle" ui/src --include="*.tsx" --include="*.ts"` → no matches (header keeps its own inline toggle).

### Step 5 (e): Remove the nonexistent brand tokens from LLM.txt

In `LLM.txt`, delete the "Custom Brand Colors" code block and its surrounding
sentences under "UI Styling Guidelines" (the block listing `--near-green` through
`--near-purple`).

**Verify**: `grep -n "near-green\|near-blue\|near-purple" LLM.txt` → no matches.

### Step 6: Full verification

**Verify**: `pnpm run typecheck && pnpm run lint && pnpm --dir ui run test` → all exit 0.

## Test plan

- `ui/src/lib/campaigns.test.ts` must stay green (untouched by this plan).
- No new tests: all changes are deletions, copy changes, or a type-field rename
  with no logic to cover.

## Done criteria

- [ ] `ls ui/src/components/ui/select.jsx ui/src/components/ui/tooltip.jsx ui/src/components/theme-toggle.tsx` → all missing
- [ ] `grep -n "GM Campaign" ui/src/routes/_authenticated/campaigns/\$campaignId.tsx` → no matches
- [ ] `grep -rn "txHash" ui/src/components/campaign-screen.tsx` → no matches
- [ ] `grep -n "near-green" LLM.txt` → no matches
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm --dir ui run test` all exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Deleting the `.jsx` files breaks typecheck (means something imported them
  explicitly with an extension — report the importer).
- The drift check shows `campaign-screen.tsx` was already restructured (plan 004
  may have landed; step 3 may be moot — report instead of re-applying).
- `grep "theme-toggle"` finds a new importer (someone started using the dead file).

## Maintenance notes

- Plan 004 retires `campaign-screen.tsx` entirely; step 3 is the honest-labeling
  stopgap until then. A reviewer should not invest further in that component.
- If a future `shadcn diff` is run (plan 006), the deleted `.jsx` files remove two
  sources of confusing drift.
