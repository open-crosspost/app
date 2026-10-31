# Plan 006: Rebase shadcn primitives on tokens (keep the brutalist skin)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1bfc624..HEAD -- ui/src/components/ui ui/src/styles.css`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Requires plan 001 DONE
> (`ui/src/components/ui/toast.tsx` deleted).

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (visual regressions across the whole app)
- **Depends on**: docs/plans/001-surface-toasts.md
- **Category**: tech-debt / dx
- **Planned at**: commit `1bfc624`, 2026-10-31

## Why this matters

The shadcn primitives have drifted far from the registry: Button's four main
variants are near-identical hardcoded strings (`bg-white dark:bg-black …
border-2 border-primary`) and **ghost is opaque with a hard border** — so every
`buttonVariants({ variant: "ghost" })` consumer (calendar day cells,
`calendar.tsx:37`) inherits an opaque background it should never have. Popover
surfaces (DropdownMenu, Select, Tooltip) each hand-roll the same
`bg-white dark:bg-black` + inline hard-shadow strings instead of using
`bg-popover` and the centralized `base-component`/`shadow-custom` utilities.
Result: `pnpm dlx shadcn@latest diff` reports unactionable drift, every restyle
touches 6+ files in lockstep, and theme changes leak. This plan rebases the
primitives on semantic tokens and expresses the neo-brutalist look **once**, via
the theme layer — the look stays, the hardcoding goes.

## Current state

**Design decision (maintainer-confirmed): keep the neo-brutalist language**
(2px primary borders, hard offset shadows, hover translate) — expressed through
tokens/utilities, not per-variant string literals.

- `ui/src/components/ui/button.tsx:7-36` — `buttonVariants` cva. Base class
  (line 8) hardcodes `hover:shadow-[2px_2px_0_rgba(0,0,0,1)]
  dark:hover:shadow-[2px_2px_0_rgba(255,255,255,0.3)]`. Variants (lines 12-22):
  `default`/`outline`/`secondary`/`ghost` are all
  `"bg-white dark:bg-black text-primary dark:text-white border-2 border-primary
  hover:bg-gray-50 dark:hover:bg-gray-900 base-component"` (identical strings);
  `destructive` and `link` are close to stock.
- `ui/src/components/ui/dropdown-menu.tsx:47,64` — content surfaces hardcode
  `"… border-2 border-primary bg-white … shadow-[4px_4px_0_rgba(0,0,0,1)]
  dark:bg-black dark:shadow-[4px_4px_0_rgba(255,255,255,0.3)] …"`.
- `ui/src/components/ui/select.tsx:20` (SelectTrigger) —
  `"… border-2 border-primary bg-white … base-component"`;
  `:69` (SelectContent) — same 4px inline shadow pattern as dropdown.
- `ui/src/components/ui/tooltip.tsx:22` — content with inline 2px shadow.
- `ui/src/components/ui/dialog.tsx:41` — `<DialogOverlay className="bg-black/20 dark:bg-white/20" />`.
- `ui/src/components/ui/calendar.tsx:37` — `day: cn(buttonVariants({ variant:
  "ghost" }), "h-8 w-8 p-0 font-normal aria-selected:opacity-100")` — the
  opaque-ghost leak.
- `ui/src/styles.css:79-98` — the centralized brutalist utilities:
  `@utility shadow-custom` (2px black), `@utility base-component` (radius + 2px
  black), `.dark .base-component` override (4px translucent white,
  lines 88-92), `@utility base-component-hover`.
- Reference for "current shadcn": `ui/components.json` exists (new-york style,
  cssVariables true) — `pnpm dlx shadcn@latest diff` is runnable and should be
  re-run at the end to record remaining drift.

## Commands you will need

| Purpose   | Command                            | Expected on success |
|-----------|------------------------------------|---------------------|
| Typecheck | `pnpm run typecheck`               | exit 0 |
| UI tests  | `pnpm --dir ui run test`           | all pass |
| Lint      | `pnpm run lint`                    | exit 0 |
| Registry drift | `pnpm --dir ui dlx shadcn@latest diff` | runs; record output in the report |

**Never use `bun`** for anything (CI fails on any `bun.lock` artifact).

## Scope

**In scope**:
- `ui/src/styles.css` (add one `shadow-custom-lg` utility)
- `ui/src/components/ui/button.tsx`
- `ui/src/components/ui/dropdown-menu.tsx`
- `ui/src/components/ui/select.tsx`
- `ui/src/components/ui/tooltip.tsx`
- `ui/src/components/ui/dialog.tsx`
- `ui/src/components/ui/toast.tsx` — must already be deleted (plan 001); touch nothing

**Out of scope**:
- All application-layer components (`ui/src/components/*.tsx`,
  `ui/src/routes/**`) — plan 005 owns those. If a consumer visually breaks
  because ghost became transparent, fix the **primitive**, not the consumer.
- `calendar.tsx`, `date-picker.tsx`, `sonner.tsx`, `table.tsx`, `card.tsx`,
  `badge.tsx`, `input.tsx`, `popover.tsx`, `label.tsx`, `avatar.tsx`,
  `checkbox.tsx` — they inherit fixes via `buttonVariants`/tokens; touch only if
  typecheck breaks.
- Any change to Button's variant **names** or size scale — consumers depend on them.

## Git workflow

- Branch: `advisor/006-primitives-rebase`
- One commit per primitive; message style `scope: description`, e.g.
  `ui: rebase button variants on semantic tokens`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the missing shadow utility

In `ui/src/styles.css`, next to `shadow-custom` (line 79):

```css
@utility shadow-custom-lg {
  box-shadow: 4px 4px 0 0 rgb(0 0 0);
}

@layer utilities {
  .dark .shadow-custom-lg {
    box-shadow: 4px 4px 0 rgba(255, 255, 255, 0.3);
  }
}
```

**Verify**: `grep -n "shadow-custom-lg" ui/src/styles.css` → 2 matches.

### Step 2: Rebase `buttonVariants`

Rewrite the variant strings in `button.tsx` (keep the cva base's interaction
behavior, replacing its hardcoded shadows with utilities):

- Base: replace
  `hover:shadow-[2px_2px_0_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0_rgba(255,255,255,0.3)]`
  with `hover:shadow-custom` + `base-component-hover` (the utility at
  styles.css:94 already carries the transition).
- `default`: `"border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 shadow-custom"`
- `outline`: `"border-2 border-primary bg-background text-foreground hover:bg-muted shadow-custom"`
- `secondary`: `"border-2 border-primary bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-custom"`
- `ghost`: `"text-foreground hover:bg-muted"` — transparent, no border, no shadow.
- `destructive` / `link`: keep as-is (already token-based).
- Keep `base-component` OFF the variants that don't want the radius/shadow
  duplication — the shadow utilities carry the look now. Keep sizes and
  `defaultVariants` unchanged.

**Verify**: `grep -c "bg-white dark:bg-black" ui/src/components/ui/button.tsx` → 0. `pnpm run typecheck` → exit 0.

### Step 3: Rebase the popover surfaces

In `dropdown-menu.tsx` (:47, :64) and `select.tsx` (:69) replace the hardcoded
surface strings with:
`"bg-popover text-popover-foreground border-2 border-primary shadow-custom-lg"`
— preserving every `data-[state=…]` animation class that follows.
In `select.tsx:20` (trigger): `bg-white` → `bg-background`.
In `tooltip.tsx:22`: replace the inline 2px shadow with `shadow-custom` and
keep `bg-popover text-popover-foreground` semantics (drop `bg-white`).

**Verify**: `grep -rn "bg-white dark:bg-black\|shadow-\[4px_4px_0_rgba" ui/src/components/ui/dropdown-menu.tsx ui/src/components/ui/select.tsx ui/src/components/ui/tooltip.tsx` → no matches.

### Step 4: Dialog overlay

`dialog.tsx:41`: `bg-black/20 dark:bg-white/20` → `bg-black/50` (standard shadcn
scrim; works in both themes).

**Verify**: `grep -n "dark:bg-white/20" ui/src/components/ui/dialog.tsx` → no matches.

### Step 5: Regression pass + record remaining drift

- Eyeball both themes (`pnpm run dev` + header toggle): buttons (all variants),
  dropdowns, selects, tooltips, dialogs, **calendar day cells** (ghost fix),
  date-picker.
- Run `pnpm --dir ui dlx shadcn@latest diff` and paste the output into the
  execution report — this is the "shadcn lint" baseline going forward.

**Verify**: `pnpm run typecheck && pnpm run lint && pnpm --dir ui run test` → all exit 0.

## Test plan

- No new unit tests: class-string changes. Existing suites must stay green.
- Manual matrix (both themes × light/dark): Button default/outline/secondary/
  ghost/destructive/link; DropdownMenu; Select (trigger + content); Tooltip;
  Dialog; Calendar (day cells transparent, selected day visible).

## Done criteria

- [ ] `grep -rn "bg-white dark:bg-black" ui/src/components/ui` → no matches
- [ ] `grep -rn "shadow-\[[0-9]px_[0-9]px_0_rgba" ui/src/components/ui` → no matches
- [ ] Calendar day cells render transparent (ghost) in both themes
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm --dir ui run test` exit 0
- [ ] `shadcn diff` output recorded in the execution report
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows `ui/src/components/ui/*` files changed beyond plan 001's
  deletion (e.g. someone hand-pulled newer registry versions) — reconcile first.
- Any consumer of `buttonVariants` breaks visually in a way a primitive-level fix
  can't cover (e.g. a component relying on ghost's opaque background as a card) —
  report the consumer; that's a plan-005-file decision.
- `shadcn diff` fails to run (registry/network) — record and continue; it is a
  report item, not a gate.

## Maintenance notes

- After this plan, re-pulling a registry component via
  `pnpm dlx shadcn@latest add <name>` becomes viable again — but expect to
  re-apply the two brutalist touches (border-2 border-primary, shadow-custom-lg)
  to content surfaces; that is the accepted tradeoff of keeping the custom look.
- The plan-008 ratchet should shrink its allowlist for `ui/src/components/ui/`
  to zero after this lands.
- Reviewers should scrutinize the Button hover/active interaction chain
  (`hover:shadow-custom`, `hover:translate-y-0.5`, `active:translate-y-1`,
  `active:shadow-none`) — it is the most feel-sensitive string in the app.
