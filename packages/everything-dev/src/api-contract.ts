import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  } catch {}
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

function localContractSource(opts: {
  configDir: string;
  key: string;
  localPath: string;
}): ContractSource {
  const contractPath = join(opts.localPath, "src", "contract.ts");
  if (!existsSync(contractPath)) {
    throw new Error(`Contract not found for ${opts.key}: ${contractPath}`);
  }
  return {
    key: opts.key,
    importName: opts.key === "api" ? "BaseApiContract" : `${sanitizeIdentifier(opts.key)}Contract`,
    importPath: toImportPath(
      join(opts.configDir, ".bos", "generated", "api-contract.gen.ts"),
      contractPath,
    ),
  };
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
      generatedPath.replace(/\.d\.ts$/, ""),
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
  const localPath = opts.source && "localPath" in opts.source ? opts.source.localPath : undefined;

  if (localPath) {
    return localContractSource({
      configDir: opts.configDir,
      key: opts.key,
      localPath,
    });
  }

  if (opts.key === "api" && !opts.baseUrl) {
    return localContractSource({
      configDir: opts.configDir,
      key: "api",
      localPath: join(opts.configDir, "api"),
    });
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
