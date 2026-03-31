import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fetchBosConfigFromFastKv } from "./fastkv";
import type { BosConfig, RuntimeConfig } from "./types";
import { BosConfigSchema } from "./types";

type BosConfigInput = Record<string, unknown> & {
  extends?: string;
  app?: Record<string, Record<string, unknown>>;
  shared?: Record<string, Record<string, Record<string, unknown>>>;
};

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

    const runtime = buildRuntimeConfig(config, options?.env ?? "development");

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

function buildRuntimeConfig(config: BosConfig, env: "development" | "production"): RuntimeConfig {
  const uiConfig = config.app.ui;
  const apiConfig = config.app.api;

  return {
    env,
    account: config.account,
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
  const merged: BosConfigInput = { ...parent, ...child };

  if (parent.app || child.app) {
    merged.app = { ...(parent.app ?? {}), ...(child.app ?? {}) };
    for (const key of new Set([
      ...Object.keys(parent.app ?? {}),
      ...Object.keys(child.app ?? {}),
    ])) {
      const parentValue = parent.app?.[key];
      const childValue = child.app?.[key];
      if (parentValue && childValue) {
        merged.app[key] = { ...parentValue, ...childValue };
      }
    }
  }

  if (parent.shared || child.shared) {
    merged.shared = { ...(parent.shared ?? {}), ...(child.shared ?? {}) };
    for (const category of new Set([
      ...Object.keys(parent.shared ?? {}),
      ...Object.keys(child.shared ?? {}),
    ])) {
      const parentValue = parent.shared?.[category];
      const childValue = child.shared?.[category];
      if (parentValue && childValue) {
        merged.shared[category] = { ...parentValue, ...childValue };
      }
    }
  }

  return merged;
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
