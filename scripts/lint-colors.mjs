#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const UI_SRC = join(process.cwd(), "ui", "src");
const ALLOWLIST_PATH = join(process.cwd(), "ui", "color-allowlist.json");

const PALETTE_REGEX =
  /\b(?:bg|text|border|ring|divide|fill|stroke|from|to|via)-(?:gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|zinc|neutral|stone)-\d+(?:\/\d+)?\b/g;
const PRIMITIVE_WHITE_BLACK_REGEX = /\b(?:bg|text)-(?:white|black)(?!\/\d)/g;

const GEN_PATTERN = /\.gen\.(ts|tsx)$|routeTree\.gen\.ts$/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry) && !GEN_PATTERN.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function countViolations() {
  const files = walk(UI_SRC);
  const counts = {};
  const samples = {};
  for (const file of files) {
    const rel = relative(process.cwd(), file).split(sep).join("/");
    const content = readFileSync(file, "utf8");
    let matches = content.match(PALETTE_REGEX) || [];
    if (rel.includes("ui/src/components/ui/")) {
      matches = [...matches, ...(content.match(PRIMITIVE_WHITE_BLACK_REGEX) || [])];
    }
    if (matches.length > 0) {
      counts[rel] = matches.length;
      const lines = content.split("\n");
      const snippets = [];
      lines.forEach((line, i) => {
        if (snippets.length >= 5) return;
        if (
          PALETTE_REGEX.test(line) ||
          (rel.includes("ui/src/components/ui/") && PRIMITIVE_WHITE_BLACK_REGEX.test(line))
        ) {
          snippets.push(`  ${rel}:${i + 1}`);
        }
      });
      samples[rel] = snippets;
    }
  }
  return { counts, samples };
}

const updateMode = process.argv.includes("--update");

if (!existsSync(ALLOWLIST_PATH)) {
  const { counts } = countViolations();
  writeFileSync(ALLOWLIST_PATH, `${JSON.stringify({ files: counts }, null, 2)}\n`);
  console.log(`Created ${ALLOWLIST_PATH} with ${Object.keys(counts).length} files.`);
  process.exit(0);
}

const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
const { counts, samples } = countViolations();

if (updateMode) {
  writeFileSync(ALLOWLIST_PATH, `${JSON.stringify({ files: counts }, null, 2)}\n`);
  console.log(`Updated ${ALLOWLIST_PATH} to ${Object.keys(counts).length} files.`);
  process.exit(0);
}

const failures = [];
const allFiles = new Set([...Object.keys(allowlist.files || {}), ...Object.keys(counts)]);
for (const file of allFiles) {
  const allowed = allowlist.files?.[file] ?? 0;
  const current = counts[file] ?? 0;
  if (current > allowed) {
    failures.push(
      `${file}: ${current} hardcoded color class(es) (allowed ${allowed})` +
        (samples[file] ? `\n${samples[file].join("\n")}` : ""),
    );
  }
}

if (failures.length > 0) {
  console.error(`Hardcoded color ratchet failed (${failures.length} file(s)):\n`);
  console.error(failures.join("\n\n"));
  console.error(
    "\nFix with semantic tokens (bg-background, text-muted-foreground, text-success, ...) — or, if justified, run `pnpm run lint:colors -- --update` to re-baseline.",
  );
  process.exit(1);
}

console.log("Color ratchet passed: no new hardcoded colors.");
