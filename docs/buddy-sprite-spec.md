# Buddy spritesheet spec (artist handoff)

Buddy is the OpenCrosspost mascot: a friendly little robot buddy with dark sunglasses, a white tee with a pencil-and-square logo, an antenna, and a red heart floating above his top right. He faces **left**. This spec tells you how to produce the animation spritesheet the web app plays him from.

## Deliverables

1. `spritesheet.webp` — the animation sheet, spec below
2. `hero.webp` — one static pose, 512×512, transparent background (the original sticker works)
3. Source files (layered, in case we need tweaks later)

## Spritesheet format

- **One file**, transparent background, lossless WebP with alpha
- **Canvas: 768 × 960 px** — a grid of **4 columns × 5 rows** of **192 × 192 px** cells
- Each **row is one animation**; frames play left → right, then loop or stop (4 frames per animation)
- The app plays the sheet with CSS/WAAPI `steps()` — no per-frame timing tricks needed, just evenly spaced frames

| Row | Animation | Frame direction | Plays |
|---|---|---|---|
| 1 (top) | **Idle** | Gentle bob, ±4 px, heart steady | Loops forever |
| 2 | **Celebrate** | Jump arc: squash at launch, stretch mid-air, land soft. Heart pulses bigger | Once |
| 3 | **Sad** | Head tilts down, mouth frowns, heart deflates slightly | Once |
| 4 | **Wave** | Waves at the viewer | Once |
| 5 (bottom) | **Sleep** | Eyes closed behind the sunglasses, slow breathing, "z" optional | Loops |

## Rules

- Character **faces left in every frame** (the app mirrors him with CSS when he needs to face right)
- Character centered horizontally in each cell, feet on a **shared baseline** with a ~24 px bottom margin — frames must not jitter between cells
- Consistent colors, proportions, and line weight across all 20 cells; the only things that move are what the animation calls for
- No grid lines, cell numbers, watermarks, or borders
- Keep him roughly 120–140 px tall within a cell (there's headroom for the jump arc in row 2)

## Reference

`ui/public/pet/spritesheet.webp` and `hero.webp` are the assets the app loads. Drop final artist art into those paths with **no code changes**.

- **Programmatic grid placeholder** — `node ui/scripts/generate-pet-placeholder.mjs` rebuilds a simple SVG-based sheet at the public paths (exact grid and row order). Backup copies of that placeholder may also live as `placeholder-spritesheet.webp` / `placeholder-hero.webp`.
- **RoboBuddy conversion** — the current public sheet may be a Codex Pets RoboBuddy atlas remapped into this 768×960 / 4×5 / 192×192 contract. Source atlas + metadata: `ui/public/pet/robobuddy/`. Regenerate with:

```bash
node ui/scripts/convert-robobuddy-to-buddy.mjs
```

Use these outputs as a **layout** reference for cell size and row order until final brand art lands.
