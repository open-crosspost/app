export {
  getMajorMinorVersion,
  getPluginSharedDependencies,
  getPluginSharedDependenciesVersionRange,
  type SharedDependencies,
  type SharedDependencyConfig,
} from "../shared-deps";
export { EmitPluginManifest, type PluginManifestEmitterOptions } from "./plugin";
export { FixMfDataUriPlugin } from "./fix-mf-data-uri-plugin";
export { EveryPluginDevServer, type EveryPluginOptions } from "./plugin";
