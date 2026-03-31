import { createPluginRuntime } from "every-plugin";
import { Context, Effect, Layer } from "every-plugin/effect";
import type { RuntimeConfig } from "everything-dev/types";
import { ConfigService } from "./config";
import { PluginError } from "./errors";

export interface LoadedPlugin {
  key: string;
  name: string;
  createClient: () => unknown;
  api: unknown;
  router: unknown;
  metadata: {
    remoteUrl: string;
    version?: string;
  };
}

export interface PluginStatus {
  available: boolean;
  pluginName: string | null;
  error: string | null;
  errorDetails: string | null;
  loadedPlugins: string[];
}

export interface PluginResult {
  runtime: ReturnType<typeof createPluginRuntime> | null;
  api: unknown;
  plugins: Record<string, LoadedPlugin>;
  status: PluginStatus;
}

function secretsFromEnv(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return out;
}

const unavailableResult = (
  pluginName: string | null,
  error: string | null,
  errorDetails: string | null,
  loadedPlugins: string[] = [],
): PluginResult => ({
  runtime: null,
  api: null,
  plugins: {},
  status: { available: false, pluginName, error, errorDetails, loadedPlugins },
});

type RuntimePluginInput = NonNullable<RuntimeConfig["plugins"]>[string];

function buildRegistry(config: RuntimeConfig): Record<string, { remote: string }> {
  const registry: Record<string, { remote: string }> = {};
  if (config.api?.url) {
    registry.api = { remote: config.api.url };
  }
  for (const [key, plugin] of Object.entries(config.plugins ?? {})) {
    if (plugin.url) {
      registry[key] = { remote: plugin.url };
    }
  }
  return registry;
}

function collectSecrets(config: RuntimePluginInput): Record<string, string> {
  return secretsFromEnv(config.secrets ?? []);
}

export const initializePlugins = Effect.gen(function* () {
  const config: RuntimeConfig = yield* ConfigService;

  if (config.api.proxy) {
    console.log(`[Plugins] Proxy mode enabled, skipping plugin initialization`);
    console.log(`[Plugins] API requests will be proxied to: ${config.api.proxy}`);
    return {
      runtime: null,
      api: null,
      plugins: {},
      status: {
        available: false,
        pluginName: config.api.name,
        error: null,
        errorDetails: null,
        loadedPlugins: [],
      },
    } satisfies PluginResult;
  }

  const registry = buildRegistry(config);
  if (Object.keys(registry).length === 0) {
    console.log("[Plugins] No remote plugins configured, using host API only");
    return unavailableResult(config.api.name, null, null);
  }

  console.log(`[Plugins] Registering ${Object.keys(registry).length} plugin(s)`);

  const result = yield* Effect.tryPromise({
    try: async () => {
      const runtime = createPluginRuntime({
        registry,
        secrets: {},
      });

      const entries = Object.entries(registry);
      const loaded = await Promise.allSettled(
        entries.map(async ([key]) => {
          const pluginConfig = key === "api" ? config.api : config.plugins?.[key];
          if (!pluginConfig) {
            throw new Error(`Missing plugin config for ${key}`);
          }

          const plugin = await runtime.usePlugin(key as never, {
            // @ts-expect-error dynamic runtime config
            variables: pluginConfig.variables ?? {},
            // @ts-expect-error dynamic runtime config
            secrets: collectSecrets(pluginConfig),
          });

          return {
            key,
            name: pluginConfig.name,
            createClient: plugin.createClient,
            api: plugin.createClient(),
            router: plugin.router,
            metadata: {
              remoteUrl: pluginConfig.url,
              version: plugin.metadata.version,
            },
          } satisfies LoadedPlugin;
        }),
      );

      const plugins: Record<string, LoadedPlugin> = {};
      const loadedPlugins: string[] = [];
      let baseApi: LoadedPlugin | null = null;
      const errors: string[] = [];

      loaded.forEach((entry, index) => {
        const key = entries[index]?.[0] ?? "unknown";
        if (entry.status === "fulfilled") {
          plugins[key] = entry.value;
          loadedPlugins.push(key);
          if (key === "api") {
            baseApi = entry.value;
          }
        } else {
          errors.push(entry.reason instanceof Error ? entry.reason.message : String(entry.reason));
        }
      });

      return {
        runtime,
        api: baseApi,
        plugins,
        status: {
          available: Boolean(baseApi),
          pluginName: config.api.name,
          error: errors.length > 0 ? errors.join("; ") : null,
          errorDetails: errors.length > 0 ? errors.join("\n") : null,
          loadedPlugins,
        },
      } satisfies PluginResult;
    },
    catch: (error) =>
      new PluginError({
        pluginName: config.api.name,
        pluginUrl: config.api.url,
        cause: error,
      }),
  });

  return result;
}).pipe(
  Effect.catchAll((error) => {
    const pluginName = error instanceof PluginError ? error.pluginName : null;
    const pluginUrl = error instanceof PluginError ? error.pluginUrl : null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[Plugins] ❌ Failed to initialize plugin");
    console.error(`[Plugins] Plugin: ${pluginName}`);
    console.error(`[Plugins] URL: ${pluginUrl}`);
    console.error(`[Plugins] Error: ${errorMessage}`);
    console.warn("[Plugins] Server will continue without plugin functionality");

    return Effect.succeed(unavailableResult(pluginName ?? null, errorMessage, errorStack ?? null));
  }),
);

export class PluginsService extends Context.Tag("host/PluginsService")<
  PluginsService,
  PluginResult
>() {
  static Live = Layer.scoped(
    PluginsService,
    Effect.gen(function* () {
      const plugins = yield* initializePlugins;

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          if (plugins.runtime) {
            console.log("[Plugins] Shutting down plugin runtime...");
            plugins.runtime.shutdown();
          }
        }),
      );

      return plugins;
    }),
  );
}
