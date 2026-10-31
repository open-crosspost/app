# Plan 001: Surface the invisible toasts (migrate to sonner)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1bfc624..HEAD -- ui/src/hooks/use-toast.ts ui/src/components/ui/toast.tsx ui/src/components/ui/toaster.tsx ui/src/routes/__root.tsx ui/src/hooks/use-submit-post.tsx ui/src/components/scheduled-posts-feed.tsx ui/src/components/schedule-post-modal.tsx ui/src/components/platform-account.tsx ui/src/routes/_authenticated/editor/index.tsx ui/src/routes/_authenticated/profile`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `1bfc624`, 2026-10-31

## Why this matters

The app's core action is crossposting, and every success/error toast in the
posting, scheduling, and account-management flows is **silently invisible**.
`__root.tsx` mounts only the sonner `<Toaster>`, while seven files call
`toast()` from `@/hooks/use-toast` — the Radix-based system whose toaster
component is never rendered. Users get no feedback when a post succeeds,
partially fails, or a file upload is rejected. Migrating the call sites to
sonner (already mounted and theme-aware) fixes all of it and lets us delete
three dead files.

## Current state

- `ui/src/routes/__root.tsx` — line 31: `import { Toaster } from "@/components/ui/sonner";`
  line 180: `<Toaster position={isDesktop ? "bottom-right" : "top-center"} closeButton />`.
  This is the **only** toaster ever mounted.
- `ui/src/hooks/use-toast.ts` — shadcn's Radix toast state manager
  (`toast({ title, description, variant, action })` API). Its render counterpart
  `ui/src/components/ui/toaster.tsx` is imported by **nothing**.
- `ui/src/components/ui/toast.tsx` — Radix toast primitives + `ToastAction`.
  Variants (lines 29-33): `default`, `destructive`, `success`.
- Call sites of `@/hooks/use-toast` (all confirmed by grep):
  - `ui/src/hooks/use-submit-post.tsx` — imports `ToastAction` (:16) and `toast` (:17); toasts at :59, :71, :81, :98, :114, :147, :338, :344, :355, :373. Two of them (:344-364) render `<ToastAction altText="See Results" onClick={() => navigate({ to: "/results" })}>` action buttons.
  - `ui/src/routes/_authenticated/editor/index.tsx` — import :22; toasts at :107, :116, :130, :138, :192.
  - `ui/src/components/scheduled-posts-feed.tsx` — import :21; toast at :147.
  - `ui/src/components/schedule-post-modal.tsx` — import :13; toasts at :42, :51, :60, :70, :80.
  - `ui/src/components/platform-account.tsx` — import :8; toasts at :60, :79, :90, :104, :109.
  - `ui/src/routes/_authenticated/profile/$accountId.tsx` — import :11; toasts at :127, :133.
- Exemplar already on sonner: `ui/src/routes/_authenticated/manage/index.tsx:7`
  imports `toast` from `"sonner"` — match that import style.
- `ui/src/components/ui/sonner.tsx` — the mounted Toaster; already theme-aware
  via `useTheme()` and popover semantic tokens (lines 5-21). No changes needed.

Sonner API mapping (sonner is a direct dependency of ui):

| Current `use-toast` call | Sonner replacement |
|---|---|
| `toast({ title, description, variant: "destructive" })` | `toast.error(title, { description })` |
| `toast({ title, description, variant: "success" })` | `toast.success(title, { description })` |
| `toast({ title, description, variant: "default" })` | `toast(title, { description })` |
| `toast({ ..., action: (<ToastAction altText="..." onClick={...}>Label</ToastAction>) })` | `toast(title, { description, action: { label: "See Results", onClick } })` |

Note: `variant: "success"` is used at `use-submit-post.tsx:341` — the
`use-toast` variant exists (`toast.tsx:32`) even though it never rendered.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0 |
| Typecheck | `pnpm run typecheck`     | exit 0, no errors |
| UI tests  | `pnpm --dir ui run test` | all vitest suites pass |
| Lint      | `pnpm run lint`          | exit 0 |

**Never use `bun`** for anything (CI fails on any `bun.lock` artifact — framework ADR 0026).

## Scope

**In scope** (the only files you should modify or delete):
- `ui/src/hooks/use-submit-post.tsx`
- `ui/src/routes/_authenticated/editor/index.tsx`
- `ui/src/components/scheduled-posts-feed.tsx`
- `ui/src/components/schedule-post-modal.tsx`
- `ui/src/components/platform-account.tsx`
- `ui/src/routes/_authenticated/profile/$accountId.tsx`
- `ui/src/hooks/use-toast.ts` (delete)
- `ui/src/components/ui/toast.tsx` (delete)
- `ui/src/components/ui/toaster.tsx` (delete)

**Out of scope** (do NOT touch, even though they look related):
- `ui/src/routes/_authenticated/manage/index.tsx` — already correct (sonner); use as the exemplar only.
- `ui/src/components/ui/sonner.tsx` — already correct and theme-aware.
- Toast *styling* / colors — handled by other plans; only the API migration is in scope.

## Git workflow

- Branch: `advisor/001-surface-toasts`
- Commit per step; message style is `scope: description` (from `git log`, e.g.
  `merge polish: fix #28's exact-match assertion`). Example:
  `ui: migrate use-toast call sites to sonner`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Migrate `use-submit-post.tsx`

Replace the imports at lines 16-17:

```tsx
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
```

with:

```tsx
import { toast } from "sonner";
```

Then convert every `toast({...})` call per the mapping table above. The two
action-button toasts (:344-353, :355-364) become, e.g.:

```tsx
toast.error("Post Failed", {
  description: `Failed to publish post to any of the ${combinedSummary.total} selected account${combinedSummary.total > 1 ? "s" : ""}.`,
  action: { label: "See Details", onClick: () => navigate({ to: "/results" }) },
});
```

**Verify**: `grep -n "use-toast\|ToastAction" ui/src/hooks/use-submit-post.tsx` → no matches.

### Step 2: Migrate the remaining five call-site files

Same conversion in:
- `ui/src/routes/_authenticated/editor/index.tsx` (5 toasts — all validation feedback)
- `ui/src/components/scheduled-posts-feed.tsx` (1)
- `ui/src/components/schedule-post-modal.tsx` (5)
- `ui/src/components/platform-account.tsx` (5)
- `ui/src/routes/_authenticated/profile/$accountId.tsx` (2)

Each file: swap the import to `import { toast } from "sonner";`, convert per the
mapping table. None of these use `ToastAction`.

**Verify**: `grep -rn "use-toast\|ui/toast" ui/src --include="*.ts" --include="*.tsx" | grep -v "components/ui/toast.tsx" | grep -v "components/ui/toaster.tsx"` → no matches.

### Step 3: Delete the dead Radix toast system

Delete these three files:
- `ui/src/hooks/use-toast.ts`
- `ui/src/components/ui/toast.tsx`
- `ui/src/components/ui/toaster.tsx`

**Verify**: `ls ui/src/hooks/use-toast.ts ui/src/components/ui/toast.tsx ui/src/components/ui/toaster.tsx 2>&1` → all "No such file or directory".

### Step 4: Full verification

**Verify**:
- `pnpm run typecheck` → exit 0
- `pnpm run lint` → exit 0 (run `pnpm run lint:fix` first if only import-order issues appear)
- `pnpm --dir ui run test` → all pass

## Test plan

- No new unit tests: the change is an API swap at UI-feedback boundaries with no
  testable logic beyond what typecheck covers. Existing suites must stay green.
- Manual check (operator): trigger a validation toast (empty post in the editor)
  and a success toast (post to NEAR Social) — both must now appear on screen.

## Done criteria

- [ ] `grep -rn "use-toast" ui/src` → no matches
- [ ] `grep -rn "components/ui/toast\b" ui/src` → no matches (file deleted)
- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run lint` exits 0
- [ ] `pnpm --dir ui run test` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (drift).
- TypeScript rejects sonner's `action: { label, onClick }` shape on any call site
  (indicates a sonner version older than the object-action API) — report the
  version from `ui/package.json` instead of rewriting call sites.
- Any toast call site uses a variant other than `default`/`destructive`/`success`
  (the mapping table is incomplete).

## Maintenance notes

- sonner toasts render through the mounted `<Toaster>` in `__root.tsx:180`; if
  someone later re-adds a second toaster system, audit for duplicates.
- A reviewer should scrutinize the two action-button conversions in
  `use-submit-post.tsx` — they are the only ones with navigation side effects.
- Plan 006 (primitive rebase) assumes this file is already deleted; keep the
  order if convenient.
