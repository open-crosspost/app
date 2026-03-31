export interface SharedDependencyConfig {
  version: string;
  singleton: boolean;
  strictVersion: boolean;
  eager: boolean;
}

export type SharedDependencies = Record<string, SharedDependencyConfig>;

export function getPluginSharedDependencies(): SharedDependencies {
  return {};
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
