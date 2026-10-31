# Plan 008: CI ratchet guard against hardcoded colors

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1bfc624..HEAD -- scripts .github/workflows/ci-child.yml package.json biome.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (best landed before/with plans 005–006 so the allowlist only shrinks)
- **Category**: dx
- **Planned at**: commit `1bfc624`, 2026-10-31

## Why this matters

AGENTS.md mandates semantic Tailwind classes ("No hardcoded colors like
`bg-blue-600`"), but nothing enforces it — which is how ~265 palette-class
usages accumulated across 26 files, with dark mode hand-maintained per class.
Biome (the repo linter, `biome.json`) has no Tailwind rule that catches this.
This plan adds a ratchet-style check: it fails **only on new violations**,
against a per-file allowlist that shrinks as plans 005/006 sweep the debt. The
standard finally holds itself without blocking work on legacy files.

## Current state

- `biome.json` — linter `recommended: true` with a few rule tweaks (lines
  10-38); no Tailwind/class-color rule exists in Biome's rule set.
- `.github/workflows/ci-child.yml` — header comment: "CHILD-OWNED — bos upgrade
  never rewrites this file (#538). This repo's extra CI jobs live here." It
  runs on `workflow_call`, has a `filter` job (paths-filter), and explicitly
  says self-owned jobs belong here. This is the right file to extend — no
  upstream issue needed (per ADR 0032, only framework-owned files require one;
  this file is child-owned).
- Root `package.json` scripts: `lint: "biome check ."`, `lint:fix`,
  `test` (runs api + ui + plugins suites), `typecheck`.
- Violation shape to detect — hardcoded Tailwind palette classes in
  `ui/src/**/*.{ts,tsx}`:
  `(bg|text|border|ring|divide|fill|stroke|from|to|via)-(gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|zinc|neutral|stone)-[0-9]+`
  (with optional `-alpha` suffixes like `/50`), plus bare `bg-white`/`bg-black`
  /`text-white`/`text-black` **only inside `ui/src/components/ui/`** (the
  primitive layer, where plan 006 drives them to zero; app-layer
  `bg-white`/`text-black` are legitimate in e.g. the landing page).

## Commands you will need

| Purpose   | Command                            | Expected on success |
|-----------|------------------------------------|---------------------|
| Install   | `pnpm install`                     | exit 0 |
| New check | `pnpm run lint:colors`             | exit 0 after allowlist generation |
| Update allowlist | `pnpm run lint:colors -- --update` | rewrites `ui/color-allowlist.json` |
| Typecheck | `pnpm run typecheck`               | exit 0 |
| Lint      | `pnpm run lint`                    | exit 0 |

**Never use `bun`** for anything (CI fails on any `bun.lock` artifact).

## Scope

**In scope**:
- `scripts/lint-colors.mjs` (create)
- `ui/color-allowlist.json` (create, generated)
- `package.json` (add one script)
- `.github/workflows/ci-child.yml` (add one job)

**Out of scope**:
- `biome.json` — Biome has no rule for this; do not attempt config-only enforcement.
- `ci.yml` / `deploy.yml` / `staging.yml` — framework-owned or unrelated.
- Fixing any of the violations themselves (plans 005/006 own that).

## Git workflow

- Branch: `advisor/008-color-ratchet`
- Commit style `scope: description`, e.g.
  `dev-infra: ratchet guard for hardcoded tailwind colors`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the checker

Create `scripts/lint-colors.mjs` (Node ≥20, no deps):

1. Walk `ui/src` for `*.ts` / `*.tsx` (skip `*.gen.ts` and `routeTree.gen.ts`).
2. Match violations with the palette regex in "Current state" (global, per
   line); additionally, inside `ui/src/components/ui/` only, match
   `\b(bg|text)-(white|black)\b`.
3. Load `ui/color-allowlist.json` — shape:
   `{ "files": { "<relative path>": <allowed count> } }`.
4. Compare per-file current count vs allowed:
   - File not in allowlist with count > 0 → **fail**.
   - File in allowlist with count > allowed → **fail**, printing the delta and
     the offending `file:line:class` snippets.
   - Count ≤ allowed → pass (shrinking is encouraged, never required).
5. `--update` flag rewrites the allowlist to current counts (the only write mode).
6. Exit 0 on pass, 1 on fail; print a one-line summary either way.

**Verify**: `node scripts/lint-colors.mjs --update && node scripts/lint-colors.mjs` → exit 0, allowlist written.

### Step 2: Wire the script

In root `package.json` `scripts`, add:

```json
"lint:colors": "node scripts/lint-colors.mjs"
```

**Verify**: `pnpm run lint:colors` → exit 0.

### Step 3: Add the CI job

In `.github/workflows/ci-child.yml`, add a job alongside the existing
self-owned jobs (same checkout pattern as the `filter` job):

```yaml
  lint-colors:
    name: Color ratchet
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0 (Node 24)
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint:colors
```

Match the pnpm/node setup style actually used by the other jobs in the file —
read the full file first and copy their exact action versions/inputs rather
than the sketch above if they differ.

**Verify (local)**: `pnpm run lint:colors` → exit 0. CI verification happens on
the PR (report it; do not push yourself).

### Step 4: Verify the ratchet actually bites

Temporarily add `bg-blue-600` to any in-scope `ui/src` file, run the check
(it must fail with a snippet), remove it.

**Verify**: `pnpm run lint:colors` → exit 1 with the violation, then → exit 0 after removal. Restore the file exactly (`git checkout -- <file>`).

## Test plan

- No app tests. The checker's own behavior is verified by Step 4's
  fail-then-pass demonstration — include both outputs in the report.

## Done criteria

- [ ] `pnpm run lint:colors` exits 0 on the current tree
- [ ] Step 4 demonstrated: violation → exit 1 with `file:line:class` output; clean → exit 0
- [ ] `.github/workflows/ci-child.yml` contains the `lint-colors` job
- [ ] `pnpm run typecheck` and `pnpm run lint` still exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `docs/plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `ci-child.yml`'s header no longer says CHILD-OWNED (framework reownership —
  adding a job would then require an upstream issue; report instead).
- The allowlist generated in Step 1 is empty because plans 005/006 already
  finished — still ship the guard (it prevents regrowth), note it in the report.
- The regex matches legitimate code (e.g. class-string construction in a util
  that assembles names dynamically) — report the site; do not loosen the regex
  to make it pass.

## Maintenance notes

- Plans 005/006 executors should run `pnpm run lint:colors -- --update` as part
  of their sweeps so the allowlist only ever shrinks.
- If the framework later ships a native Tailwind lint rule, retire this script
  and the CI job in the same change.
- Reviewers should scrutinize the regex's exclusions (`*.gen.ts`) — the generated
  `ui/src/lib/api-types.gen.ts` et al. are gitignored/regenerated and must stay
  excluded.
