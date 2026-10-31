# Plan 005: Dark-mode repair — unpaired colors → semantic tokens

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1bfc624..HEAD -- ui/src/styles.css ui/src/components ui/src/routes`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (pairs naturally with plans 006/008)
- **Category**: bug (dark-mode legibility) / tech-debt
- **Planned at**: commit `1bfc624`, 2026-10-31

## Why this matters

The token layer is healthy, but the application layer bypasses it: ~44 hardcoded
Tailwind palette classes have **no `dark:` variant at all** (dim gray text on
near-black, light-gray panels, a white-blue drag flash in dark mode), and dozens
of paired sites encode a *different palette* in dark mode (`bg-green-50
dark:bg-black`) so the two themes feel unrelated — the direct source of "some
dark mode is terrible". Converting these to the existing semantic tokens makes
dark mode correct by construction (zero `dark:` variants needed) and honors the
repo's own documented rule: AGENTS.md Style Requirements — "Use semantic
Tailwind classes… No hardcoded colors like `bg-blue-600`".

## Current state

**Token system** (`ui/src/styles.css`):
- `:root` / `.dark` (lines 6-51) define the standard shadcn set plus a custom
  `--success` (light `oklch(0.627 0.194 149.214)`, dark `oklch(0.723 0.219
  149.579)`) already mapped in `@theme inline` as `--color-success` (line 70) —
  i.e. `text-success` / `bg-success` utilities exist and are dark-ready.
- There is **no** `--warning` token; amber/yellow status colors have nowhere
  semantic to go (Step 1 adds it).
- `--destructive` / `--destructive-foreground` exist and are used correctly in
  some places.
- Dark mode = `.dark` class via next-themes (`__root.tsx:166`,
  `@custom-variant dark` at `styles.css:4`). Do not change this machinery.

**The repair targets** (verified locations; palette classes with no `dark:`
pair, or dark-palette mismatches):

| File | Sites | Problem |
|---|---|---|
| `ui/src/components/account-item.tsx` | :41-46, :55-58, :66-69, :81-84, :112-117, :124-137, :152 | worst offender (~44 palette usages); unpaired reds/grays; `bg-green-50 dark:bg-black` mismatch |
| `ui/src/components/scheduled-posts-feed.tsx` | :28-34, :44-50, :86 | status icon/badge colors unpaired |
| `ui/src/routes/_authenticated/results/index.tsx` | :109, :119, :128, :133, :138, :144, :159, :168, :175, :181-182 | success/error blocks unpaired (`text-red-700`, `bg-red-50 dark:bg-red-900`, `border-black dark:border-white`) |
| `ui/src/routes/_authenticated/leaderboard/index.tsx` | :248, :439, :448-449, :455, :462, :484, :487, :499 | `bg-white dark:bg-black` table chrome, unpaired grays/blues |
| `ui/src/routes/_authenticated/profile/$accountId.tsx` | :69, :146, :156, :170, :184, :190-200, :213, :225 | unpaired grays/reds/blues |
| `ui/src/components/preview-modal.tsx` | :18, :24, :30, :37, :43, :46, :54, :63, :75, :91, :106 | `bg-gray-100` panel, unpaired grays, `bg-blue-500` avatar |
| `ui/src/components/ui/textarea.tsx` | :88 | `ring-2 ring-blue-500 ring-opacity-50 bg-blue-50` drag state — no dark variant |
| `ui/src/components/header.tsx` | :20 | app chrome `bg-white dark:bg-black` |
| `ui/src/components/drafts-modal.tsx` | :31, :38, :45, :48, :55, :82 | `text-gray-600` unpaired (:38, :45), white/black chrome |
| `ui/src/components/media-preview-modal.tsx` | :35, :64 | white/black chrome, unpaired gray |
| `ui/src/components/post-interaction-selector.tsx` | :38, :54-55 | green chip mismatch, unpaired reds/greens |
| `ui/src/components/profile-card.tsx` | :46, :48, :65 | unpaired grays |
| `ui/src/components/loading-spinner.tsx` | (whole file) | `text-gray-500/600` unpaired — ~3:1 contrast on dark |
| `ui/src/components/landing-page.tsx` | :12, :24, :48, :52, :56, :149, :155, :165 | feature-icon palette pairs, `text-neutral-950 dark:text-white`, white/black marquee band |

Note: `ui/src/components/ui/toast.tsx` (a cited offender) is deleted by plan 001
— skip it. The `.supported-platforms-section` hex colors
(`styles.css:181-209`) are a deliberate theme-invariant marketing section —
**out of scope**.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm run typecheck`     | exit 0 |
| UI tests  | `pnpm --dir ui run test` | all pass |
| Lint      | `pnpm run lint`          | exit 0 |
| Spot check (Step 5) | `grep -rnoE "(bg|text|border)-(gray|blue|red|green|yellow|neutral|zinc)-[0-9]+[^ \"]*" ui/src/components ui/src/routes --include="*.tsx" \| wc -l` | a count you drive toward 0 for the in-scope files |

**Never use `bun`** for anything (CI fails on any `bun.lock` artifact).

## Scope

**In scope**:
- `ui/src/styles.css` (add `--warning` token only)
- The 14 application-layer files listed in "Current state"

**Out of scope**:
- `ui/src/components/ui/*` primitives (Button, DropdownMenu, Select, Dialog,
  Tooltip, calendar) — plan 006 owns the primitive layer. Exception:
  `ui/src/components/ui/textarea.tsx:88` (application behavior — drag state).
- `ui/src/styles.css` `.supported-platforms-section` block — deliberate.
- Landing-page glitch section.
- `--near-*` brand tokens — deliberately not reintroduced (see plan 002).

## Git workflow

- Branch: `advisor/005-dark-mode-tokens`
- One commit per file or small group; message style `scope: description`, e.g.
  `ui: semantic status colors in account-item and scheduled-posts-feed`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the missing `--warning` token

In `ui/src/styles.css`: add to `:root` `--warning: oklch(0.769 0.188 70.08);`
and to `.dark` `--warning: oklch(0.795 0.184 86.047);` (Tailwind v4 amber-600 /
oklch equivalents that hold contrast on both backgrounds), and to `@theme inline`
`--color-warning: var(--warning);` — mirroring how `--success` (lines 23, 47,
70) is wired.

**Verify**: `grep -n "color-warning" ui/src/styles.css` → 1 match.

### Step 2: Apply the semantic mapping, file by file

Use this mapping table everywhere in the in-scope files (it is the whole ruleset
— do not invent new mappings per file):

| Hardcoded | Semantic replacement |
|---|---|
| `bg-white dark:bg-black` (surfaces) | `bg-background` (chrome/panels) or `bg-popover` (modal/overlay content) |
| `text-black dark:text-white` | `text-foreground` |
| `text-gray-700 dark:text-gray-300` / `text-gray-800` | `text-foreground` |
| `text-gray-500 dark:text-gray-400`, `text-gray-600 dark:text-gray-400`, unpaired `text-gray-500/400` | `text-muted-foreground` |
| `border-gray-200 dark:border-gray-800`, unpaired `border-gray-200/300` | `border-border` |
| `bg-gray-100`, `bg-gray-50 dark:bg-gray-800/900`, `bg-gray-100 dark:bg-gray-800` | `bg-muted` (hover: `hover:bg-muted`) |
| red error/status (`text-red-500/600/700`, `bg-red-50 dark:bg-red-900`, `border-red-400/500`) | `text-destructive`, `bg-destructive/10`, `border-destructive/40` |
| green success (`text-green-500/600/700`, `bg-green-50/100`, `border-green-500`) | `text-success`, `bg-success/10`, `border-success` |
| yellow pending (`text-yellow-500`, `bg-yellow-100 dark:bg-yellow-900`) | `text-warning`, `bg-warning/15` |
| blue in-progress/info (`text-blue-500/600`, `bg-blue-100 dark:bg-blue-900`, `bg-blue-500` avatar) | `text-primary`, `bg-primary/10`, `bg-primary` |
| `border-black dark:border-white` | `border-primary` (the brutalist border language) |
| unpaired `shadow-[2px_2px_0_rgba(0,0,0,1)] dark:shadow-[…]` | `base-component` / `shadow-custom` utilities (styles.css:79-92) |

Specifics worth pinning:
- `account-item.tsx` selection ring (:83, :152): `border-success bg-success`
  with `text-primary-foreground` check; error card (:41): `border-destructive/60
  bg-destructive/10`; disabled card (:43): `border-border bg-muted`.
- `scheduled-posts-feed.tsx` status badge map (:44-50): pending →
  `bg-primary/10 text-primary`; running → `bg-warning/15 text-warning`; done →
  `bg-success/10 text-success`; failed → `bg-destructive/10 text-destructive`.
- `textarea.tsx:88` drag state: `ring-2 ring-primary bg-primary/5`.
- `header.tsx:20`: `bg-background`.
- `preview-modal.tsx:37` avatar fallback: `bg-primary text-primary-foreground`.
- `leaderboard/index.tsx` table chrome (:455, :462, :484, :487): `bg-background`
  / `bg-card`, `divide-border`, `hover:bg-muted` — keep the `border-primary`
  accents.

After each file: eyeball **both** themes in the running app
(`pnpm run dev`, toggle via the header button) before committing.

**Verify per file**: the Step-5 grep shows the file no longer matches (except
the allowed landing-page/`supported-platforms-section` exceptions).

### Step 3: Landing page feature icons

`landing-page.tsx:12,48,52,56` — map the three feature-icon palette pairs to
theme-stable tokens (`text-primary`, `text-success`, `text-warning` — the
calendar/zap/shield trio). Keep `:24` (`text-foreground`) and `:165`
(`bg-background`) per the table.

**Verify**: `grep -n "blue-600\|purple-600\|green-600" ui/src/components/landing-page.tsx` → no matches.

### Step 4: Full verification

**Verify**: `pnpm run typecheck && pnpm run lint && pnpm --dir ui run test` → all exit 0.

### Step 5: Regression sweep

**Verify**: the grep command above returns **0** matches under `ui/src/components`
and `ui/src/routes` for palette classes **excluding** files/lines explicitly out
of scope (`landing-page.tsx` glitch-adjacent hex usage is in styles.css, so the
only allowed remainder is nothing). If any match survives, fix it or justify it
in the report.

## Test plan

- No unit tests: class-string changes with no logic. Coverage is the grep sweep
  (Step 5) + manual both-theme eyeballing of every touched surface (editor,
  campaigns, results, leaderboard, profile, modals, landing).
- Existing suites must stay green.

## Done criteria

- [ ] `grep -n "color-warning" ui/src/styles.css` → 1 match
- [ ] Step 5 grep → 0 matches in scope
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm --dir ui run test` exit 0
- [ ] No `ui/src/components/ui/*` file modified except `textarea.tsx`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A mapped replacement is visually wrong in one theme and no mapping-table entry
  covers it — report the site and screenshot; do not invent a new hardcoded value.
- The drift check shows plan 006 already restyled a target file — reconcile with
  006's token-based variants instead of re-hardcoding.
- `--warning` collides with an existing token name in `@theme inline`.

## Maintenance notes

- After this plan, plan 008's ratchet allowlist should shrink to (near) zero for
  the application layer — regenerate it when 008 lands.
- The `success`/`warning`/`destructive` trio is now the status-color vocabulary;
  review new UI against it in PR.
- Dark-mode contrast for `--warning` was chosen from the Tailwind oklch amber
  scale; if the design system later defines official values, update `:root` and
  `.dark` in one place (styles.css) — that is the point of this plan.
