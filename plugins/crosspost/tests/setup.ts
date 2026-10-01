import { createPluginRuntime } from "every-plugin";
import Plugin from "@/index";
import pluginDevConfig from "../plugin.dev";

const TEST_PLUGIN_ID = pluginDevConfig.pluginId;
const TEST_CONFIG = pluginDevConfig.config;

// Create shared runtime (initialized once)
export const runtime = createPluginRuntime({
  registry: {
    [TEST_PLUGIN_ID]: { module: Plugin },
  },
  secrets: {},
});

// Helper to get client (reuses same plugin instance)
export async function getPluginClient() {
  const { createClient } = await runtime.usePlugin(TEST_PLUGIN_ID, TEST_CONFIG);
  return createClient();
}
