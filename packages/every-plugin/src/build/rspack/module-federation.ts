import { getPluginSharedDependencies } from "../shared-deps";
import type { PluginInfo } from "./utils";

export function buildSharedDependencies(_pluginInfo: PluginInfo) {
  return getPluginSharedDependencies();
}
