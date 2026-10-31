import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "pet");

const FRAME = 192;
const COLS = 4;
const ROWS = 5;
const SHEET_W = FRAME * COLS;
const SHEET_H = FRAME * ROWS;

const GRAY = "#8f98a3";
const GRAY_DARK = "#6b7280";
const GRAY_LIGHT = "#c3cad2";
const INK = "#1f2430";
const TEE = "#ffffff";
const HEART = "#e23b3b";

function buddySvg({ dx = 0, dy = 0, squash = 1, mood = "idle", heartScale = 1, zzz = false }) {
  const lift = mood === "sad" ? 6 : 0;
  return `<g transform="translate(${96 + dx} ${168 + dy}) scale(${squash} ${2 - squash}) translate(${-96} ${-168})">
    <g transform="translate(0 ${lift})">
      <g transform="translate(96 60)">
        <circle cx="0" cy="-34" r="4" fill="none" stroke="${INK}" stroke-width="4"/>
        <line x1="0" y1="-30" x2="0" y2="-18" stroke="${INK}" stroke-width="4"/>
        <rect x="-44" y="-18" width="88" height="72" rx="26" fill="${GRAY}"/>
        <rect x="-44" y="-18" width="88" height="72" rx="26" fill="none" stroke="${INK}" stroke-width="5"/>
        ${mood === "sleep" ? `<rect x="-36" y="0" width="72" height="10" rx="5" fill="${GRAY_LIGHT}"/>` : ""}
        <g transform="${mood === "sad" ? "rotate(8)" : ""}">
          <rect x="-40" y="-8" width="30" height="18" rx="8" fill="${INK}"/>
          <rect x="-4" y="-8" width="30" height="18" rx="8" fill="${INK}"/>
          <line x1="-10" y1="-2" x2="-4" y2="-2" stroke="${INK}" stroke-width="4"/>
          <line x1="26" y1="-2" x2="34" y2="-2" stroke="${INK}" stroke-width="4"/>
        </g>
        ${mood === "sad" ? `<path d="M -14 26 Q -6 20 2 26" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` : `<path d="M -18 20 Q -8 30 2 20" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`}
        <ellipse cx="42" cy="8" rx="12" ry="14" fill="${GRAY_LIGHT}" stroke="${INK}" stroke-width="4"/>
      </g>
      <g transform="translate(96 128)">
        <rect x="-34" y="-24" width="68" height="60" rx="22" fill="${TEE}"/>
        <rect x="-34" y="-24" width="68" height="60" rx="22" fill="none" stroke="${INK}" stroke-width="5"/>
        <rect x="-16" y="-12" width="32" height="24" rx="5" fill="none" stroke="${INK}" stroke-width="4"/>
        <line x1="4" y1="8" x2="12" y2="-4" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
        <rect x="-20" y="36" width="18" height="26" rx="8" fill="${GRAY_DARK}"/>
        <rect x="2" y="36" width="18" height="26" rx="8" fill="${GRAY_DARK}"/>
        ${mood === "wave" ? `<circle cx="-52" cy="${-30 - 10}" r="12" fill="${GRAY_LIGHT}" stroke="${INK}" stroke-width="4"/>` : `<circle cx="-48" cy="-16" r="12" fill="${GRAY_LIGHT}" stroke="${INK}" stroke-width="4"/>`}
      </g>
    </g>
    <g transform="translate(150 ${34}) scale(${heartScale})">
      <path d="M 0 6 C -2 0 -12 -2 -12 6 C -12 12 -4 16 0 20 C 4 16 12 12 12 6 C 12 -2 2 0 0 6 Z" fill="${HEART}" stroke="${INK}" stroke-width="4" transform="translate(0 -10)"/>
    </g>
    ${zzz ? `<text x="164" y="52" font-family="sans-serif" font-size="22" font-weight="700" fill="${INK}">z</text>` : ""}
  </g>`;
}

function cellSvg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME}" height="${FRAME}" viewBox="0 0 ${FRAME} ${FRAME}">${content}</svg>`;
}

const idleDy = [0, -4, 0, -4];
const celebrateDy = [0, -12, -28, -12];
const celebrateSquash = [1.08, 0.95, 0.9, 0.98];
const sadDy = [0, 2, 3, 2];
const waveFrames = [0, 1, 2, 1];

const rows = [
  idleDy.map((dy) => ({ mood: "idle", dy })),
  celebrateDy.map((dy, i) => ({
    mood: "idle",
    dy,
    squash: celebrateSquash[i],
    heartScale: 1 + (3 - Math.abs(i - 1.5)) * 0.2,
  })),
  sadDy.map((dy) => ({ mood: "sad", dy })),
  waveFrames.map((i) => ({ mood: "wave", dy: i * 2 })),
  [0, 1, 2, 3].map((i) => ({ mood: "sleep", dy: i % 2, zzz: i > 1 })),
];

const cells = rows.flatMap((row, r) =>
  row.map((f, c) =>
    cellSvg(buddySvg(f)).replace("<svg ", `<svg x="${c * FRAME}" y="${r * FRAME}" `),
  ),
);

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="${SHEET_H}" viewBox="0 0 ${SHEET_W} ${SHEET_H}">${cells.join("")}</svg>`;

const hero = cellSvg(buddySvg({}));

await mkdir(outDir, { recursive: true });
await sharp(Buffer.from(sheet)).webp({ lossless: true }).toFile(join(outDir, "spritesheet.webp"));
await sharp(Buffer.from(hero))
  .resize(512, 512)
  .webp({ lossless: true })
  .toFile(join(outDir, "hero.webp"));
console.log("Wrote public/pet/spritesheet.webp and public/pet/hero.webp");
