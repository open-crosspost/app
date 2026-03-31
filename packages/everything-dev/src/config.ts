import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fetchBosConfigFromFastKv } from "./fastkv";
import { getNetworkIdForAccount } from "./network";
import type { BosConfig, RuntimeConfig, RuntimePluginConfig } from "./types";
import { BosConfigSchema } from "./types";

interface BosConfigInput extends Record<string, unknown> {
  extends?: string;
  cwd?: string;
  development?: string;
  production?: string;
  proxy?: string;
  variables?: Record<string, string>;
  secrets?: string[];
  app?: Record<string, Record<string, unknown>>;
  shared?: Record<string, Record<string, Record<string, unknown>>>;
  plugins?: Record<string, BosConfigInput>;
}

let cachedConfig: BosConfig | null = null;
let projectRoot: string | null = null;

export function clearConfigCache(): void {
  cachedConfig = null;
  projectRoot = null;
}

export function findConfigPath(cwd?: string): string | null {
  let dir = cwd ?? process.cwd();
  while (dir !== "/") {
    const configPath = join(dir, "bos.config.json");
    if (existsSync(configPath)) {
      return configPath;
    }
    dir = dirname(dir);
  }
  return null;
}

export function getConfig(): BosConfig | null {
  return cachedConfig;
}

export function getProjectRoot(): string {
  if (!projectRoot) {
    throw new Error("Config not loaded. Call loadConfig() first.");
  }
  return projectRoot;
}

export interface ConfigResult {
  config: BosConfig;
  runtime: RuntimeConfig;
  source: {
    path: string;
    extended?: string[];
    remote?: boolean;
  };
}

export async function loadConfig(options?: {
  cwd?: string;
  path?: string;
  env?: "development" | "production";
}): Promise<ConfigResult | null> {
  const configPath = options?.path ?? findConfigPath(options?.cwd);
  if (!configPath) {
    projectRoot = options?.cwd ?? process.cwd();
    return null;
  }

  const baseDir = dirname(configPath);

  try {
    const extendedChain: string[] = [];
    const parsed = await resolveConfigWithExtends(configPath, baseDir, new Set(), extendedChain);
    const config = BosConfigSchema.parse(parsed);

    cachedConfig = config;
    projectRoot = baseDir;

    const pluginRuntime = await resolveRuntimePlugins(
      config.plugins ?? {},
      baseDir,
      options?.env ?? "development",
    );
    const runtime = buildRuntimeConfig(config, options?.env ?? "development", {
      plugins: pluginRuntime,
    });

    return {
      config,
      runtime,
      source: {
        path: configPath,
        extended: extendedChain.length > 0 ? extendedChain : undefined,
        remote: extendedChain.some((entry) => entry.startsWith("bos://")),
      },
    };
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${error}`);
  }
}

export async function loadBosConfig(options?: {
  cwd?: string;
  path?: string;
  env?: "development" | "production";
}): Promise<RuntimeConfig> {
  const result = await loadConfig(options);
  if (!result) {
    throw new Error("No bos.config.json found");
  }

  return result.runtime;
}

function buildRuntimeConfig(
  config: BosConfig,
  env: "development" | "production",
  options?: { plugins?: Record<string, RuntimePluginConfig> },
): RuntimeConfig {
  const uiConfig = config.app.ui;
  const apiConfig = config.app.api;

  return {
    env,
    account: config.account,
    networkId: getNetworkIdForAccount(config.account),
    hostUrl: config.app.host[env],
    shared: config.shared,
    ui: {
      name: uiConfig.name,
      url: uiConfig[env] ?? "",
      entry: `${uiConfig[env] ?? ""}/mf-manifest.json`,
      ssrUrl: uiConfig.ssr,
      source: env === "development" ? "local" : "remote",
    },
    api: {
      name: apiConfig.name,
      url: apiConfig[env] ?? "",
      entry: `${apiConfig[env] ?? ""}/mf-manifest.json`,
      source: env === "development" ? "local" : "remote",
      proxy: apiConfig.proxy,
      variables: apiConfig.variables,
      secrets: apiConfig.secrets,
    },
    plugins:
      options?.plugins && Object.keys(options.plugins).length > 0 ? options.plugins : undefined,
  };
}

async function loadConfigFile(configPath: string, baseDir: string): Promise<BosConfigInput> {
  if (configPath.startsWith("bos://")) {
    return fetchBosConfigFromFastKv<BosConfigInput>(configPath);
  }

  const resolvedPath = isAbsolute(configPath) ? configPath : resolve(baseDir, configPath);
  return JSON.parse(readFileSync(resolvedPath, "utf-8")) as BosConfigInput;
}

async function resolveConfigWithExtends(
  configPath: string,
  baseDir: string,
  visited: Set<string>,
  chain: string[],
): Promise<BosConfigInput> {
  if (visited.has(configPath)) {
    throw new Error(`Circular extends detected: ${[...visited, configPath].join(" -> ")}`);
  }

  const config = await loadConfigFile(configPath, baseDir);
  if (configPath.startsWith("bos://")) {
    chain.push(configPath);
  }

  if (!config.extends) {
    return config;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(configPath);
  const parentPath = config.extends;
  const parentBaseDir = parentPath.startsWith("bos://")
    ? baseDir
    : isAbsolute(parentPath)
      ? dirname(parentPath)
      : baseDir;
  const parent = await resolveConfigWithExtends(parentPath, parentBaseDir, nextVisited, chain);

  return mergeConfigs(parent, config);
}

function mergeConfigs(parent: BosConfigInput, child: BosConfigInput): BosConfigInput {
  return mergeValues(parent, child) as BosConfigInput;
}

async function resolveRuntimePlugins(
  plugins: Record<string, BosConfigInput>,
  baseDir: string,
  env: "development" | "production",
  prefix: string[] = [],
): Promise<Record<string, RuntimePluginConfig>> {
  const out: Record<string, RuntimePluginConfig> = {};

  for (const [pluginId, pluginInput] of Object.entries(plugins)) {
    const runtimeKey = [...prefix, pluginId].join("/");
    const { config: resolvedConfig, baseDir: pluginBaseDir } = await resolveBosConfigInput(
      pluginInput,
      baseDir,
      new Set(),
      [],
    );

    const pluginRuntime = buildRuntimePluginConfig(
      runtimeKey,
      resolvedConfig,
      pluginBaseDir,
      env,
      pluginInput,
    );
    out[runtimeKey] = pluginRuntime;

    if (resolvedConfig.plugins && Object.keys(resolvedConfig.plugins).length > 0) {
      const nested = await resolveRuntimePlugins(resolvedConfig.plugins, pluginBaseDir, env, [
        ...prefix,
        pluginId,
      ]);
      Object.assign(out, nested);
    }
  }

  return out;
}

function buildRuntimePluginConfig(
  pluginId: string,
  config: BosConfigInput,
  baseDir: string,
  env: "development" | "production",
  source: BosConfigInput,
): RuntimePluginConfig {
  const apiConfig = config.app?.api ?? {};
  const apiName = typeof apiConfig.name === "string" ? apiConfig.name : pluginId;
  const apiDevelopment =
    typeof apiConfig.development === "string" ? apiConfig.development : undefined;
  const apiProduction = typeof apiConfig.production === "string" ? apiConfig.production : undefined;
  const sourceDevelopment = typeof source.development === "string" ? source.development : undefined;
  const sourceProduction = typeof source.production === "string" ? source.production : undefined;
  const runtimeUrl =
    env === "development"
      ? (apiDevelopment ?? sourceDevelopment ?? "")
      : (apiProduction ?? sourceProduction ?? "");
  const proxy = typeof apiConfig.proxy === "string" ? apiConfig.proxy : undefined;

  return {
    name: apiName,
    url: runtimeUrl,
    entry: runtimeUrl ? `${runtimeUrl.replace(/\/$/, "")}/mf-manifest.json` : "/mf-manifest.json",
    source: source.cwd ? "local" : "remote",
    cwd: source.cwd ? resolve(baseDir, source.cwd) : undefined,
    port: runtimeUrl ? parsePort(runtimeUrl) : undefined,
    proxy: proxy ?? (typeof source.proxy === "string" ? source.proxy : undefined),
    variables: normalizeStringRecord(apiConfig.variables ?? source.variables),
    secrets: normalizeStringArray(apiConfig.secrets ?? source.secrets),
  };
}

async function resolveBosConfigInput(
  input: BosConfigInput,
  baseDir: string,
  visited: Set<string>,
  chain: string[],
): Promise<{ config: BosConfigInput; baseDir: string }> {
  if (input.cwd) {
    const cwd = resolve(baseDir, input.cwd);
    const configPath = join(cwd, "bos.config.json");
    const config = await resolveConfigWithExtends(configPath, cwd, visited, chain);
    return { config: mergeConfigs(config, input), baseDir: cwd };
  }

  if (input.extends) {
    const parentBaseDir = input.extends.startsWith("bos://")
      ? baseDir
      : isAbsolute(input.extends)
        ? dirname(input.extends)
        : baseDir;
    const config = await resolveConfigWithExtends(input.extends, parentBaseDir, visited, chain);
    return { config: mergeConfigs(config, input), baseDir: parentBaseDir };
  }

  return { config: input, baseDir };
}

function mergeValues(parent: unknown, child: unknown): unknown {
  if (Array.isArray(parent) && Array.isArray(child)) {
    return child;
  }

  if (isPlainObject(parent) && isPlainObject(child)) {
    const merged: Record<string, unknown> = { ...parent };
    for (const [key, value] of Object.entries(child)) {
      merged[key] = key in merged ? mergeValues(merged[key], value) : value;
    }
    return merged;
  }

  return child ?? parent;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isPlainObject(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      out[key] = raw;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return out.length > 0 ? out : undefined;
}

export function parsePort(url: string): number {
  try {
    const parsed = new URL(url);
    return parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
  } catch {
    return 3000;
  }
}

export type { BosConfig, RuntimeConfig } from "./types";
export { BosConfigSchema } from "./types";
