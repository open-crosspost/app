# Buddy foundation (#32) — close-out

Paste-friendly status for [issue #32](https://github.com/open-crosspost/app/issues/32).

## Done

- Artist handoff: [`docs/buddy-sprite-spec.md`](./buddy-sprite-spec.md)
- Sprite player (`ui/src/components/pet/sprite-player.tsx`) with WAAPI `steps()`; non-idle → `onStateDone`; reduced-motion path covered by `sprite-player.test.tsx`
- Buddy mounted on landing + authenticated (`_public.tsx`, `_authenticated.tsx`)
- Drag (dnd-kit), localStorage position, resize clamp, flip by screen half, dismiss/restore
- Assets at `ui/public/pet/spritesheet.webp` (768×960) + `hero.webp` (512×512); RoboBuddy source + `ui/scripts/convert-robobuddy-to-buddy.mjs`
- Old shitzu floating helper removed; badge components untouched
- Gates: UI typecheck + vitest green; host serves pet assets at `http://localhost:4100`

## Deferred to #33

Product-triggered celebrate / sad / wave (and speech bubbles). SpritePlayer already defines the states; Buddy stays on looping `idle` until #33 wires triggers.
