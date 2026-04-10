import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { RuntimeConfig } from "./types";

interface ContractTypeSource {
  key: string;
  sourcePath: string;
  outputPath: string;
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function generateContractTypes(opts: {
  configDir: string;
  runtimeConfig: RuntimeConfig;
}): string[] {
  const generatedDir = join(opts.configDir, ".bos", "generated", "contract-types");
  const outputFiles: string[] = [];

  if (existsSync(generatedDir)) {
    rmSync(generatedDir, { recursive: true });
  }
  ensureDir(generatedDir);

  const pluginEntries = Object.entries(opts.runtimeConfig.plugins ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [key, plugin] of pluginEntries) {
    if (!("localPath" in plugin) || !plugin.localPath) {
      continue;
    }

    const contractPath = join(plugin.localPath, "src", "contract.ts");
    if (!existsSync(contractPath)) {
      console.warn(`Contract not found for plugin ${key}: ${contractPath}`);
      continue;
    }

    const outputDir = join(generatedDir, key);
    ensureDir(outputDir);

    const outputFile = join(outputDir, "contract.d.ts");

    try {
      const result = execSync(
        `npx tsc --declaration --emitDeclarationOnly --allowJs --skipLibCheck --esModuleInterop --moduleResolution node --target ES2022 --module ESNext --outDir "${outputDir}" "${contractPath}"`,
        {
          cwd: opts.configDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

      const expectedOutput = join(outputDir, "src", "contract.d.ts");
      if (existsSync(expectedOutput)) {
        const content = readFileSync(expectedOutput, "utf-8");
        const processed = processTypeFile(content, key);
        writeFileSync(outputFile, processed);

        const srcDir = join(outputDir, "src");
        if (existsSync(srcDir)) {
          rmSync(srcDir, { recursive: true });
        }

        outputFiles.push(outputFile);
        console.log(`✅ Generated contract types for ${key}`);
      }
    } catch (error) {
      console.error(`❌ Failed to generate types for ${key}:`, error);
    }
  }

  return outputFiles;
}

function processTypeFile(content: string, pluginKey: string): string {
  let processed = content;

  processed = processed.replace(/import\s+.*?\s+from\s+['"]every-plugin\/[^'"]+['"]\s*;?\n?/g, "");

  processed = processed.replace(
    /import\s+\*\s+as\s+\w+\s+from\s+['"]every-plugin\/[^'"]+['"]\s*;?\n?/g,
    "",
  );

  processed = processed.replace(
    /import\s+{\s*CommonPluginErrors\s*}\s+from\s+['"]every-plugin['"]\s*;?\n?/g,
    "",
  );

  processed = processed.replace(
    /import\s+type\s+{\s*[^}]+\s*}\s+from\s+['"]every-plugin\/[^'"]+['"]\s*;?\n?/g,
    "",
  );

  const lines = processed.split("\n").filter((line) => line.trim() !== "");
  processed = lines.join("\n");

  if (!processed.includes("export type ContractType")) {
    processed += "\n\nexport type ContractType = typeof contract;\n";
  }

  return processed;
}

function writeAggregateContractTypeFile(opts: { configDir: string; pluginKeys: string[] }): string {
  const generatedDir = join(opts.configDir, ".bos", "generated");
  const contractTypesDir = join(generatedDir, "contract-types");
  const outputFile = join(generatedDir, "api-contract.gen.ts");

  const lines: string[] = [];

  const apiContractPath = join(opts.configDir, "api", "src", "contract.ts");
  const relativeApiPath = relative(dirname(outputFile), apiContractPath).replace(/\\/g, "/");
  lines.push(`import type { ContractType as BaseApiContract } from "${relativeApiPath}";`);

  for (const key of opts.pluginKeys) {
    const contractTypePath = join(contractTypesDir, key, "contract.d.ts");
    if (existsSync(contractTypePath)) {
      const relativePath = relative(
        dirname(outputFile),
        contractTypePath.replace(/\.d\.ts$/, ""),
      ).replace(/\\/g, "/");
      const importName = `${key.replace(/[^A-Za-z0-9_]/g, "_")}Contract`;
      lines.push(`import type { ContractType as ${importName} } from "${relativePath}";`);
    }
  }

  lines.push("");

  const validKeys = opts.pluginKeys.filter((key) =>
    existsSync(join(contractTypesDir, key, "contract.d.ts")),
  );

  if (validKeys.length === 0) {
    lines.push(`export type ApiContract = BaseApiContract;`);
  } else {
    lines.push(`export type ApiContract = BaseApiContract & {`);
    for (const key of validKeys) {
      const importName = `${key.replace(/[^A-Za-z0-9_]/g, "_")}Contract`;
      lines.push(`  ${key}: ${importName};`);
    }
    lines.push("};");
  }

  ensureDir(dirname(outputFile));
  writeFileSync(outputFile, `${lines.join("\n")}\n`);

  return outputFile;
}

export async function syncContractTypes(opts: {
  configDir: string;
  runtimeConfig: RuntimeConfig;
}): Promise<{
  outputPath: string;
  generatedFiles: string[];
}> {
  const pluginEntries = Object.entries(opts.runtimeConfig.plugins ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const generatedFiles = generateContractTypes(opts);

  const outputPath = writeAggregateContractTypeFile({
    configDir: opts.configDir,
    pluginKeys: pluginEntries.map(([key]) => key),
  });

  return {
    outputPath,
    generatedFiles,
  };
}
