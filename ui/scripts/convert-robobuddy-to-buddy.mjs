import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const petDir = join(here, "..", "public", "pet");
const sourceDir = join(petDir, "robobuddy");

const require = createRequire(import.meta.url);
function loadSharp() {
  const candidates = [
    process.env.SHARP_MODULE,
    join(root, ".tmp-sharp", "node_modules", "sharp"),
    join(process.env.TEMP || "/tmp", "robobuddy-sharp", "node_modules", "sharp"),
    join(here, "..", "node_modules", "sharp"),
    join(root, "node_modules", "sharp"),
    "sharp",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next
    }
  }
  throw new Error("sharp is required. Install with: npm install sharp@0.34.5 --prefix .tmp-sharp");
}

const sharp = loadSharp();

const SRC_CELL_W = 192;
const SRC_CELL_H = 208;
const SRC_COLS = 8;
const DST_CELL = 192;
const DST_COLS = 4;
const DST_ROWS = 5;
const DST_W = DST_CELL * DST_COLS;
const DST_H = DST_CELL * DST_ROWS;

const CODEX_ROWS = {
  idle: 0,
  "running-right": 1,
  "running-left": 2,
  waving: 3,
  jumping: 4,
  failed: 5,
  waiting: 6,
  running: 7,
  review: 8,
};

const AUDIT_MAPPING = [
  { name: "idle", srcRow: CODEX_ROWS.idle, frames: 4, codexState: "idle" },
  { name: "celebrate", srcRow: CODEX_ROWS.jumping, frames: 4, codexState: "jumping" },
  { name: "sad", srcRow: CODEX_ROWS.failed, frames: 4, codexState: "failed" },
  { name: "wave", srcRow: CODEX_ROWS.waving, frames: 4, codexState: "waving" },
  { name: "sleep", srcRow: CODEX_ROWS.waiting, frames: 4, codexState: "waiting" },
];

const SEMANTIC_MAPPING = [
  {
    name: "idle",
    srcRow: CODEX_ROWS.idle,
    frames: 4,
    codexState: "idle",
    note: "Standing wave-hand pose; closest looping idle available",
  },
  {
    name: "celebrate",
    srcRow: CODEX_ROWS.waiting,
    frames: 4,
    codexState: "waiting",
    note: "RoboBuddy atlas stores arms-up celebrate poses in the Codex waiting row",
  },
  {
    name: "sad",
    srcRow: CODEX_ROWS.failed,
    frames: 4,
    codexState: "failed",
    note: "Seated/dejected pose",
  },
  {
    name: "wave",
    srcRow: CODEX_ROWS.waving,
    frames: 4,
    codexState: "waving",
    note: "Squash-and-raise arm sequence",
  },
  {
    name: "sleep",
    srcRow: CODEX_ROWS.jumping,
    frames: 4,
    codexState: "jumping",
    note: "RoboBuddy atlas stores lying-down Zzz sleep poses in the Codex jumping row",
  },
];

const useAuditMapping = process.argv.includes("--audit-mapping");
const MAPPING = useAuditMapping ? AUDIT_MAPPING : SEMANTIC_MAPPING;

async function extractBottomAlignedCell(sourcePath, col, row) {
  const left = col * SRC_CELL_W;
  const top = row * SRC_CELL_H;
  const cell = await sharp(sourcePath)
    .extract({ left, top, width: SRC_CELL_W, height: SRC_CELL_H })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = cell;
  const { width, height, channels } = info;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + (channels - 1)];
      if (a > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    return sharp({
      create: {
        width: DST_CELL,
        height: DST_CELL,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const maxContentH = DST_CELL - 8;
  const maxContentW = DST_CELL - 8;
  const scale = Math.min(1, maxContentW / contentW, maxContentH / contentH);

  const scaledW = Math.max(1, Math.round(contentW * scale));
  const scaledH = Math.max(1, Math.round(contentH * scale));

  const cropped = await sharp(data, { raw: { width, height, channels } })
    .extract({ left: minX, top: minY, width: contentW, height: contentH })
    .resize(scaledW, scaledH, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const offsetX = Math.floor((DST_CELL - scaledW) / 2);
  const offsetY = DST_CELL - scaledH - 8;

  return sharp({
    create: {
      width: DST_CELL,
      height: DST_CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left: offsetX, top: Math.max(0, offsetY) }])
    .png()
    .toBuffer();
}

async function convertSpritesheet(sourcePath, destPath) {
  const meta = await sharp(sourcePath).metadata();
  if (meta.width !== SRC_CELL_W * SRC_COLS || meta.height !== SRC_CELL_H * 11) {
    throw new Error(
      `Unexpected source dimensions ${meta.width}x${meta.height}; expected ${SRC_CELL_W * SRC_COLS}x${SRC_CELL_H * 11}`,
    );
  }

  const composites = [];
  for (let r = 0; r < MAPPING.length; r++) {
    const mapping = MAPPING[r];
    for (let c = 0; c < mapping.frames; c++) {
      const cell = await extractBottomAlignedCell(sourcePath, c, mapping.srcRow);
      composites.push({
        input: cell,
        left: c * DST_CELL,
        top: r * DST_CELL,
      });
    }
  }

  await sharp({
    create: {
      width: DST_W,
      height: DST_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ lossless: true })
    .toFile(destPath);

  return { width: DST_W, height: DST_H, rows: MAPPING.map((m) => m.name) };
}

async function convertHero(sourcePosterPath, destPath) {
  const poster = sharp(sourcePosterPath);
  const meta = await poster.metadata();
  const raw = await poster.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = raw;
  const { width, height, channels } = info;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + (channels - 1)];
      if (a > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const size = 512;
  if (maxX < 0) {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .webp({ lossless: true })
      .toFile(destPath);
    return { width: size, height: size, source: meta };
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const pad = 48;
  const scale = Math.min((size - pad * 2) / contentW, (size - pad * 2) / contentH);
  const scaledW = Math.max(1, Math.round(contentW * scale));
  const scaledH = Math.max(1, Math.round(contentH * scale));
  const cropped = await sharp(data, { raw: { width, height, channels } })
    .extract({ left: minX, top: minY, width: contentW, height: contentH })
    .resize(scaledW, scaledH, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const offsetX = Math.floor((size - scaledW) / 2);
  const offsetY = size - scaledH - pad;

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left: offsetX, top: Math.max(0, offsetY) }])
    .webp({ lossless: true })
    .toFile(destPath);

  return { width: size, height: size, source: meta };
}

async function main() {
  await mkdir(sourceDir, { recursive: true });

  const sourceSheet = join(sourceDir, "spritesheet.webp");
  const sourcePoster = join(sourceDir, "poster.webp");
  const sourcePetJson = join(sourceDir, "pet.json");
  const destSheet = join(petDir, "spritesheet.webp");
  const destHero = join(petDir, "hero.webp");
  const placeholderSheet = join(petDir, "placeholder-spritesheet.webp");
  const placeholderHero = join(petDir, "placeholder-hero.webp");

  const petJson = JSON.parse(await readFile(sourcePetJson, "utf8"));
  if (petJson.id !== "robobuddy" || petJson.spritesheetPath !== "spritesheet.webp") {
    throw new Error(`Unexpected pet.json: ${JSON.stringify(petJson)}`);
  }

  try {
    await readFile(placeholderSheet);
  } catch {
    await copyFile(destSheet, placeholderSheet);
  }
  try {
    await readFile(placeholderHero);
  } catch {
    await copyFile(destHero, placeholderHero);
  }

  const sheetResult = await convertSpritesheet(sourceSheet, destSheet);
  const heroResult = await convertHero(sourcePoster, destHero);

  const summary = {
    source: {
      id: petJson.id,
      displayName: petJson.displayName,
      spriteVersionNumber: petJson.spriteVersionNumber,
      path: sourceSheet,
    },
    mappingMode: useAuditMapping ? "audit" : "semantic",
    mapping: MAPPING,
    note: useAuditMapping
      ? "Used literal Codex-label audit mapping (--audit-mapping)."
      : "Default semantic mapping: RoboBuddy artwork places sleep in jumping and celebrate in waiting.",
    output: {
      spritesheet: { path: destSheet, ...sheetResult },
      hero: { path: destHero, ...heroResult },
      placeholders: { spritesheet: placeholderSheet, hero: placeholderHero },
    },
  };

  await writeFile(
    join(sourceDir, "conversion-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
  console.log("Wrote Buddy-compatible spritesheet and hero from RoboBuddy.");
}

await main();
