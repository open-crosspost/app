import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as typeof import("../../package.json");

export interface SharedDependencyConfig {
  version: string;
  requiredVersion: string | false;
  singleton: boolean;
  strictVersion: boolean;
  eager: boolean;
}

export type SharedDependencies = Record<string, SharedDependencyConfig>;

function extractExactVersion(input: string): string {
  const match = input.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  return match ? match[0] : input.replace(/^[\^~>=<\s]+/, "");
}

function getInstalledPackageVersion(packageName: string, fallbackVersion: string): string {
  try {
    return require(`${packageName}/package.json`).version as string;
  } catch {
    return extractExactVersion(fallbackVersion);
  }
}

function createSharedDependency(version: string): SharedDependencyConfig {
  return {
    version,
    requiredVersion: false,
    singleton: true,
    strictVersion: false,
    eager: false,
  };
}

export const pluginSharedDependencies = {
  "every-plugin": createSharedDependency(pkg.version),
  effect: createSharedDependency(getInstalledPackageVersion("effect", pkg.peerDependencies.effect)),
  zod: createSharedDependency(getInstalledPackageVersion("zod", pkg.peerDependencies.zod)),
} satisfies SharedDependencies;

export type PluginSharedDependencyName = keyof typeof pluginSharedDependencies;

export function getPluginSharedDependencies(): SharedDependencies {
  return pluginSharedDependencies;
}

export function getPluginSharedDependenciesVersionRange(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(getPluginSharedDependencies()).map(([name, config]) => [
      name,
      getMajorMinorVersion(config.version),
    ]),
  );
}

export function getMajorMinorVersion(version: string): string {
  const clean = version.replace(/^[\^~>=<]+/, "");
  const match = clean.match(/^(\d+)\.(\d+)/);
  if (!match) return "^0.0.0";
  return `^${match[1]}.${match[2]}.0`;
}
