import { execSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import type { RuntimeConfig, RuntimePluginConfig } from "./types";

export interface ApiPluginManifest {
  schemaVersion: 1;
  kind: "every-plugin/manifest";
  plugin: {
    name: string;
    version: string;
  };
  runtime: {
    remoteEntry: string;
  };
  contract?: {
    kind: "orpc";
    types: {
      path: string;
      exportName: string;
      typeName: string;
      sha256?: string;
    };
  };
}

interface ContractSource {
  key: string;
  importName: string;
  importPath: string;
  generatedPath?: string;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function trimTrailingSlash(input: string): string {
  return input.replace(/\/$/, "");
}

function sanitizeIdentifier(input: string): string {
  return input.replace(/[^A-Za-z0-9_]/g, "_").replace(/^[^A-Za-z_]+/, "_");
}

function toImportPath(fromFile: string, targetFile: string): string {
  const rel = relative(dirname(fromFile), targetFile).replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function writeFileIfChanged(filePath: string, content: string) {
  try {
    if (readFileSync(filePath, "utf8") === content) return false;
  } catch {
    // file does not exist yet
  }

  writeFileSync(filePath, content);
  return true;
}

function getApiPluginManifestUrl(apiBaseUrl: string): string {
  return `${trimTrailingSlash(apiBaseUrl)}/plugin.manifest.json`;
}

async function fetchApiPluginManifest(apiBaseUrl: string): Promise<ApiPluginManifest> {
  const response = await fetch(getApiPluginManifestUrl(apiBaseUrl));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch API plugin manifest: ${response.status} ${response.statusText}`,
    );
  }

  const manifest = (await response.json()) as ApiPluginManifest;
  if (manifest.schemaVersion !== 1 || manifest.kind !== "every-plugin/manifest") {
    throw new Error("Unsupported API plugin manifest format");
  }

  return manifest;
}

function localApiContractSource(configDir: string): ContractSource {
  const sourcePath = join(configDir, "api", "src", "contract.ts");
  return {
    key: "api",
    importName: "BaseApiContract",
    importPath: toImportPath(
      join(configDir, ".bos", "generated", "api-contract.gen.ts"),
      sourcePath,
    ),
  };
}

function findDtsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findDtsFiles(fullPath));
    } else if (entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function generateLocalContractTypes(opts: {
  configDir: string;
  runtimeDir: string;
  key: string;
  localPath: string;
}): string {
  const contractPath = join(opts.localPath, "src", "contract.ts");
  if (!existsSync(contractPath)) {
    throw new Error(`Contract not found for plugin ${opts.key}: ${contractPath}`);
  }

  const outputDir = join(opts.runtimeDir, "contract-types", opts.key);
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true });
  }
  mkdirSync(outputDir, { recursive: true });

  try {
    execSync(
      `npx tsc --declaration --emitDeclarationOnly --allowJs --skipLibCheck --esModuleInterop --moduleResolution bundler --target ES2022 --module ESNext --outDir "${outputDir}" "${contractPath}"`,
      {
        cwd: opts.configDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    const expectedOutput = join(outputDir, "contract.d.ts");
    if (existsSync(expectedOutput)) {
      let content = readFileSync(expectedOutput, "utf-8");

      content = content.replace(/from\s+['"]every-plugin\/zod['"]/g, 'from "zod"');
      content = content.replace(/from\s+['"]every-plugin\/orpc['"]/g, 'from "@orpc/contract"');
      content = content.replace(/from\s+['"]every-plugin['"]/g, 'from "@orpc/contract"');
      content = content.replace(
        /import\s+{\s*CommonPluginErrors\s*}\s+from\s+['"]@orpc\/contract['"]\s*;?\n?/g,
        "",
      );
      content = content.replace(
        /import\s+\*\s+as\s+\w+\s+from\s+['"]every-plugin\/[^'"]+['"]\s*;?\n?/g,
        "",
      );
      content = content.replace(
        /import\s+type\s+{\s*[^}]+\s*}\s+from\s+['"]every-plugin\/[^'"]+['"]\s*;?\n?/g,
        "",
      );

      const lines = content.split("\n").filter((line) => line.trim() !== "");
      content = lines.join("\n");

      if (!content.includes("export type ContractType")) {
        content += "\n\nexport type ContractType = typeof contract;\n";
      }

      const finalOutput = join(outputDir, "contract.d.ts");
      writeFileSync(finalOutput, content);

      const typesDir = join(outputDir, "types");
      if (existsSync(typesDir)) {
        const typeFiles = findDtsFiles(typesDir);
        for (const typeFile of typeFiles) {
          let typeContent = readFileSync(typeFile, "utf-8");
          typeContent = typeContent.replace(/from\s+['"]every-plugin\/zod['"]/g, 'from "zod"');
          typeContent = typeContent.replace(
            /from\s+['"]every-plugin\/orpc['"]/g,
            'from "@orpc/contract"',
          );
          typeContent = typeContent.replace(
            /from\s+['"]every-plugin['"]/g,
            'from "@orpc/contract"',
          );
          writeFileSync(typeFile, typeContent);
        }
      }

      return finalOutput;
    } else {
      throw new Error(`TypeScript did not generate expected output: ${expectedOutput}`);
    }
  } catch (error) {
    throw new Error(
      `Failed to generate types for ${opts.key}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function remoteContractSource(opts: {
  configDir: string;
  runtimeDir: string;
  name: string;
  baseUrl: string;
  generatedSubdir: string;
}): Promise<ContractSource> {
  const manifest = await fetchApiPluginManifest(opts.baseUrl);
  if (!manifest.contract) {
    throw new Error(
      `Plugin manifest for ${manifest.plugin.name} does not advertise contract types`,
    );
  }

  const contractUrl = `${trimTrailingSlash(opts.baseUrl)}/${manifest.contract.types.path.replace(/^\.\//, "")}`;
  const contractResponse = await fetch(contractUrl);
  if (!contractResponse.ok) {
    throw new Error(
      `Failed to fetch contract types: ${contractResponse.status} ${contractResponse.statusText}`,
    );
  }

  const contractTypes = await contractResponse.text();
  if (manifest.contract.types.sha256 && manifest.contract.types.sha256 !== sha256(contractTypes)) {
    throw new Error("Fetched contract types failed checksum verification");
  }

  const generatedPath = join(opts.runtimeDir, opts.generatedSubdir, "contract.d.ts");
  mkdirSync(dirname(generatedPath), { recursive: true });
  writeFileIfChanged(generatedPath, contractTypes);

  return {
    key: opts.name,
    importName: `${sanitizeIdentifier(opts.name)}Contract`,
    importPath: toImportPath(
      join(opts.configDir, ".bos", "generated", "api-contract.gen.ts"),
      generatedPath,
    ),
    generatedPath,
  };
}

async function resolveContractSource(opts: {
  configDir: string;
  runtimeDir: string;
  key: string;
  source: RuntimePluginConfig | { url: string; localPath?: string; name: string } | null;
  baseUrl: string;
  generatedSubdir: string;
}): Promise<ContractSource> {
  if (
    opts.key === "api" &&
    (!opts.source || !("localPath" in opts.source) || opts.source.localPath)
  ) {
    const localPath = opts.source && "localPath" in opts.source ? opts.source.localPath : undefined;
    if (localPath) {
      return {
        key: opts.key,
        importName: "BaseApiContract",
        importPath: toImportPath(
          join(opts.configDir, ".bos", "generated", "api-contract.gen.ts"),
          join(localPath, "src", "contract.ts"),
        ),
      };
    }

    if (!opts.baseUrl) {
      return localApiContractSource(opts.configDir);
    }
  }

  if (opts.source && "localPath" in opts.source && opts.source.localPath) {
    const generatedPath = generateLocalContractTypes({
      configDir: opts.configDir,
      runtimeDir: opts.runtimeDir,
      key: opts.key,
      localPath: opts.source.localPath,
    });

    return {
      key: opts.key,
      importName: `${sanitizeIdentifier(opts.key)}Contract`,
      importPath: toImportPath(
        join(opts.configDir, ".bos", "generated", "api-contract.gen.ts"),
        generatedPath.replace(/\.d\.ts$/, ""),
      ),
      generatedPath,
    };
  }

  return remoteContractSource({
    configDir: opts.configDir,
    runtimeDir: opts.runtimeDir,
    name: opts.key,
    baseUrl: opts.baseUrl,
    generatedSubdir: opts.generatedSubdir,
  });
}

function writeAggregateContractFile(opts: {
  configDir: string;
  sources: ContractSource[];
  pluginKeys: string[];
}) {
  const bridgePath = join(opts.configDir, ".bos", "generated", "api-contract.gen.ts");
  const lines: string[] = [];

  for (const source of opts.sources) {
    lines.push(`import type { ContractType as ${source.importName} } from "${source.importPath}";`);
  }

  lines.push("");
  const baseSource = opts.sources.find((source) => source.key === "api");
  const pluginSources = opts.pluginKeys
    .map((key) => opts.sources.find((entry) => entry.key === key))
    .filter((source): source is ContractSource => Boolean(source));

  if (!baseSource) {
    throw new Error("API contract source is required to generate the aggregate contract");
  }

  if (pluginSources.length === 0) {
    lines.push(`export type ApiContract = ${baseSource.importName};`);
  } else {
    lines.push(`export type ApiContract = ${baseSource.importName} & {`);
    for (const source of pluginSources) {
      const key = /^[$A-Z_][0-9A-Z_$]*$/i.test(source.key)
        ? source.key
        : JSON.stringify(source.key);
      lines.push(`  ${key}: ${source.importName};`);
    }
    lines.push("};");
  }
  mkdirSync(dirname(bridgePath), { recursive: true });
  writeFileIfChanged(bridgePath, `${lines.join("\n")}\n`);
  return bridgePath;
}

export async function syncApiContractBridge(opts: {
  configDir: string;
  runtimeConfig: RuntimeConfig;
  apiBaseUrl: string;
}): Promise<{
  bridgePath: string;
  generatedPath: string | null;
  manifest: ApiPluginManifest | null;
  source: "local" | "remote";
}> {
  const runtimeDir = join(opts.configDir, ".bos", "generated");
  const pluginEntries = Object.entries(opts.runtimeConfig.plugins ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const sources: ContractSource[] = [];
  let manifest: ApiPluginManifest | null = null;
  let generatedPath: string | null = null;

  const baseSource = await resolveContractSource({
    configDir: opts.configDir,
    runtimeDir,
    key: "api",
    source: opts.runtimeConfig.api,
    baseUrl: opts.apiBaseUrl,
    generatedSubdir: "api",
  });
  sources.push(baseSource);

  for (const [key, plugin] of pluginEntries) {
    const source = await resolveContractSource({
      configDir: opts.configDir,
      runtimeDir,
      key,
      source: plugin,
      baseUrl: plugin.url,
      generatedSubdir: `plugins/${key}`,
    });
    sources.push(source);
    if (source.generatedPath) {
      generatedPath = source.generatedPath;
    }
  }

  writeAggregateContractFile({
    configDir: opts.configDir,
    sources,
    pluginKeys: pluginEntries.map(([key]) => key),
  });

  if (opts.runtimeConfig.api.source !== "local") {
    manifest = await fetchApiPluginManifest(opts.apiBaseUrl);
  }

  return {
    bridgePath: join(opts.configDir, ".bos", "generated", "api-contract.gen.ts"),
    generatedPath,
    manifest,
    source: opts.runtimeConfig.api.source,
  };
}
