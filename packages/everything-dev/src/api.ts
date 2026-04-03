import { ensureNodeRuntimePlugin, registerRemote } from "./mf";
import { createPluginRuntime } from "./plugin";
import type { RuntimeConfig, RuntimePluginConfig } from "./types";

export interface LoadedPluginResult {
  key: string;
  name: string;
  router: any;
  client: any;
  metadata: {
    remoteUrl: string;
    version?: string;
  };
}

export interface LoadedPluginsResult {
  base: LoadedPluginResult | null;
  plugins: LoadedPluginResult[];
  errors: Array<{ key: string; error: string }>;
}

export async function loadApiPlugin(opts: {
  key: string;
  runtimeId: string;
  name: string;
  entry: string;
  variables?: Record<string, string>;
  secrets?: Record<string, string>;
}): Promise<LoadedPluginResult> {
  const remoteEntryUrl = (() => {
    if (opts.entry.endsWith("/remoteEntry.js")) return opts.entry;
    if (opts.entry.endsWith("/mf-manifest.json")) {
      return `${opts.entry.replace(/\/mf-manifest\.json$/, "")}/remoteEntry.js`;
    }
    if (opts.entry.endsWith(".js")) return opts.entry;
    return `${opts.entry.replace(/\/$/, "")}/remoteEntry.js`;
  })();

  await ensureNodeRuntimePlugin();
  // Use remoteEntry.js for the plugin runtime for now. mf-manifest.json support
  // is still inconsistent across our stack.
  await registerRemote({ name: opts.runtimeId, entry: remoteEntryUrl });

  const runtime: any = createPluginRuntime({
    registry: {
      [opts.runtimeId]: { remote: remoteEntryUrl },
    },
    secrets: opts.secrets ?? {},
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: usePlugin is not a React hook
  const plugin = await runtime.usePlugin(opts.runtimeId, {
    variables: opts.variables ?? {},
    secrets: opts.secrets ?? {},
  });

  return {
    key: opts.key,
    name: opts.name,
    router: plugin.router,
    client: plugin.createClient(),
    metadata: {
      remoteUrl: remoteEntryUrl,
      version: plugin.metadata.version,
    },
  };
}

function collectSecrets(config: RuntimePluginConfig, envSecrets?: Record<string, string>) {
  const secrets: Record<string, string> = {};
  for (const key of config.secrets ?? []) {
    const value = envSecrets?.[key] ?? process.env[key];
    if (value) {
      secrets[key] = value;
    }
  }
  return secrets;
}

export async function loadApiPluginsFromRuntimeConfig(
  runtimeConfig: RuntimeConfig,
  envSecrets?: Record<string, string>,
): Promise<LoadedPluginsResult> {
  const entries: Array<[string, RuntimePluginConfig]> = [];

  if (runtimeConfig.api?.url) {
    entries.push(["api", runtimeConfig.api]);
  }

  for (const [key, plugin] of Object.entries(runtimeConfig.plugins ?? {})) {
    if (plugin.url) {
      entries.push([key, plugin]);
    }
  }

  if (entries.length === 0) {
    console.log("[API] No plugins configured");
    return { base: null, plugins: [], errors: [] };
  }

  const loaded = await Promise.allSettled(
    entries.map(async ([key, pluginConfig]) => {
      console.log(`[API] Loading plugin: ${pluginConfig.name} from ${pluginConfig.entry}`);
      return loadApiPlugin({
        key,
        runtimeId: pluginConfig.name,
        name: pluginConfig.name,
        entry: pluginConfig.entry,
        variables: pluginConfig.variables,
        secrets: collectSecrets(pluginConfig, envSecrets),
      });
    }),
  );

  const plugins: LoadedPluginResult[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  loaded.forEach((result, index) => {
    const [key] = entries[index] ?? ["unknown"];
    if (result.status === "fulfilled") {
      plugins.push(result.value);
    } else {
      errors.push({
        key,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  const base = plugins.find((plugin) => plugin.key === "api") ?? null;
  return { base, plugins, errors };
}

export function createStitchedRouter(baseRouter: any, plugins: LoadedPluginResult[] | null): any {
  if (!plugins || plugins.length === 0) {
    return baseRouter;
  }

  return plugins.reduce((router, plugin) => Object.assign(router, plugin.router), baseRouter);
}
