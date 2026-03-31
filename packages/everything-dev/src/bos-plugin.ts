import { Effect } from "effect";
import { buildRuntimeConfig, detectLocalPackages } from "./app";
import { getProjectRoot, loadConfig, parsePort } from "./config";
import { type BuildOptions, bosContract, type DevOptions, type StartOptions } from "./contract";
import { type AppConfig, type AppOrchestrator, startApp } from "./dev-session";
import { fetchBosConfigFromFastKv } from "./fastkv";
import { createPlugin, z } from "./plugin";
import { syncAndGenerateSharedUi } from "./shared";
import type { BosConfig, SourceMode } from "./types";
import { run } from "./utils/run";

const DEFAULT_DEV_CONFIG: AppConfig = {
  host: "local",
  ui: "local",
  api: "local",
  ssr: false,
};

const buildCommands: Record<string, { cmd: string; args: string[] }> = {
  host: { cmd: "bun", args: ["run", "build"] },
  ui: { cmd: "bun", args: ["run", "build"] },
  api: { cmd: "bun", args: ["run", "build"] },
};

type BosDeps = {
  bosConfig: BosConfig | null;
  configDir: string;
};

function parseSourceMode(value: string | undefined, defaultValue: SourceMode): SourceMode {
  if (value === "local" || value === "remote") return value;
  return defaultValue;
}

function buildAppConfig(options: {
  host?: string;
  ui?: string;
  api?: string;
  proxy?: boolean;
  ssr?: boolean;
}): AppConfig {
  return {
    host: parseSourceMode(options.host, DEFAULT_DEV_CONFIG.host),
    ui: parseSourceMode(options.ui, DEFAULT_DEV_CONFIG.ui),
    api: parseSourceMode(options.api, DEFAULT_DEV_CONFIG.api),
    proxy: options.proxy,
    ssr: options.ssr ?? DEFAULT_DEV_CONFIG.ssr,
  };
}

function buildDescription(config: AppConfig): string {
  if (config.host === "local" && config.ui === "local" && config.api === "local" && !config.proxy) {
    return "Full Local Development";
  }

  const parts: string[] = [];
  parts.push(config.host === "remote" ? "Remote Host" : "Local Host");
  if (config.ui === "remote") parts.push("Remote UI");
  if (config.proxy) parts.push("Proxy API → Production");
  else if (config.api === "remote") parts.push("Remote API");
  return parts.join(" + ");
}

function determineProcesses(config: AppConfig): string[] {
  const processes: string[] = [];
  if (config.ssr && config.ui === "local") processes.push("ui-ssr");
  if (config.ui === "local") processes.push("ui");
  if (config.api === "local" && !config.proxy) processes.push("api");
  processes.push("host");
  return processes;
}

function isValidProxyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveProxyUrl(bosConfig: BosConfig | null): string | null {
  if (!bosConfig) return null;
  const apiConfig = bosConfig.app.api;
  if (!apiConfig) return null;
  if (apiConfig.proxy && isValidProxyUrl(apiConfig.proxy)) return apiConfig.proxy;
  if (apiConfig.production && isValidProxyUrl(apiConfig.production)) return apiConfig.production;
  return null;
}

async function buildEnvVars(
  config: AppConfig,
  bosConfig?: BosConfig | null,
): Promise<Record<string, string>> {
  const env: Record<string, string> = {
    HOST_SOURCE: config.host,
    UI_SOURCE: config.ui,
    API_SOURCE: config.api,
  };

  if (config.host === "remote") {
    const remoteUrl = bosConfig?.app.host.production;
    if (remoteUrl) env.HOST_REMOTE_URL = remoteUrl;
  }

  if (config.ui === "remote") {
    const remoteUrl = bosConfig?.app.ui.production;
    if (remoteUrl) env.UI_REMOTE_URL = remoteUrl;
  }

  if (config.api === "remote") {
    const remoteUrl = bosConfig?.app.api.production;
    if (remoteUrl) env.API_REMOTE_URL = remoteUrl;
  }

  if (config.proxy && bosConfig) {
    const proxyUrl = resolveProxyUrl(bosConfig);
    if (proxyUrl) env.API_PROXY = proxyUrl;
  }

  return env;
}

async function buildEveryPluginQuietly(cwd: string) {
  const proc = Bun.spawn({
    cmd: ["bun", "run", "--cwd", "packages/every-plugin", "build"],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode === 0) {
    console.log("[build:ssr] build succeeded");
    return;
  }

  if (stdout.trim()) {
    process.stdout.write(stdout);
  }

  if (stderr.trim()) {
    process.stderr.write(stderr);
  }

  throw new Error(`bun run --cwd packages/every-plugin build failed with exit code ${exitCode}`);
}

async function fetchPublishedConfig(
  accountId: string,
  gatewayId: string,
): Promise<BosConfig | null> {
  try {
    return await fetchBosConfigFromFastKv<BosConfig>(`bos://${accountId}/${gatewayId}`);
  } catch {
    return null;
  }
}

export default createPlugin({
  variables: z.object({
    configPath: z.string().optional(),
  }),
  secrets: z.object({}),
  contract: bosContract,
  initialize: (config: any) =>
    Effect.promise(async () => {
      const configResult = await loadConfig({ path: config.variables.configPath });
      return {
        bosConfig: configResult?.config ?? null,
        configDir: getProjectRoot(),
      } satisfies BosDeps;
    }),
  shutdown: () => Effect.void,
  createRouter: (deps: BosDeps, builder: any) => ({
    dev: builder.dev.handler(async ({ input }: { input: DevOptions }) => {
      const localPackages = detectLocalPackages();

      const appConfig = buildAppConfig({
        host: localPackages.includes("host") ? (input.host as string) : "remote",
        ui: localPackages.includes("ui") ? (input.ui as string) : "remote",
        api: localPackages.includes("api") ? (input.api as string) : "remote",
        proxy: input.proxy,
        ssr: input.ssr,
      });

      const sharedSync = await syncAndGenerateSharedUi({
        configDir: deps.configDir,
        hostMode: appConfig.host,
      });
      if (sharedSync.catalogChanged) {
        await run("bun", ["install"], { cwd: deps.configDir });
      }
      if (appConfig.api === "local" && !appConfig.proxy) {
        await buildEveryPluginQuietly(deps.configDir);
      }

      const refreshed = await loadConfig({ cwd: deps.configDir });
      deps.bosConfig = refreshed?.config ?? deps.bosConfig;

      if (!deps.bosConfig) {
        return {
          status: "error" as const,
          description: "No bos.config.json found",
          processes: [],
        };
      }

      if (appConfig.proxy && !resolveProxyUrl(deps.bosConfig)) {
        return {
          status: "error" as const,
          description: "No valid proxy URL configured in bos.config.json",
          processes: [],
        };
      }

      const processes = determineProcesses(appConfig);
      const env = await buildEnvVars(appConfig, deps.bosConfig);
      const hostPort = input.port ?? parsePort(deps.bosConfig.app.host.development);
      const runtimeConfig = buildRuntimeConfig(deps.bosConfig, {
        uiSource: appConfig.ui,
        apiSource: appConfig.api,
        hostUrl: `http://localhost:${hostPort}`,
        proxy: env.API_PROXY,
        env: "development",
      });
      if (!appConfig.ssr) {
        runtimeConfig.ui.ssrUrl = undefined;
      }

      const orchestrator: AppOrchestrator = {
        packages: processes,
        env,
        description: buildDescription(appConfig),
        appConfig,
        bosConfig: deps.bosConfig,
        runtimeConfig,
        port: hostPort,
        interactive: input.interactive,
      };

      startApp(orchestrator);

      return {
        status: "started" as const,
        description: orchestrator.description,
        processes,
      };
    }),

    start: builder.start.handler(async ({ input }: { input: StartOptions }) => {
      let remoteConfig: BosConfig | null = null;
      if (input.account && input.domain) {
        remoteConfig = await fetchPublishedConfig(input.account, input.domain);
        if (!remoteConfig) {
          return {
            status: "error" as const,
            url: "",
          };
        }
      }

      const config = remoteConfig || deps.bosConfig;
      if (!config) {
        return {
          status: "error" as const,
          url: "",
        };
      }

      const port = input.port ?? parsePort(config.app.host.development);
      const appConfig: AppConfig = { host: "remote", ui: "remote", api: "remote" };
      const env = await buildEnvVars(appConfig, config);
      const runtimeConfig = buildRuntimeConfig(config, {
        uiSource: "remote",
        apiSource: "remote",
        hostUrl: `http://localhost:${port}`,
        env: "production",
      });

      const orchestrator: AppOrchestrator = {
        packages: ["host"],
        env: {
          NODE_ENV: "production",
          ...env,
        },
        description: `Production Mode (${config.account})`,
        appConfig,
        bosConfig: config,
        runtimeConfig,
        port,
        interactive: input.interactive,
        noLogs: true,
      };

      startApp(orchestrator);
      return {
        status: "running" as const,
        url: `http://localhost:${port}`,
      };
    }),

    build: builder.build.handler(async ({ input }: { input: BuildOptions }) => {
      const allPackages = deps.bosConfig ? Object.keys(deps.bosConfig.app) : [];
      const targets =
        input.packages === "all"
          ? allPackages
          : input.packages
              .split(",")
              .map((pkg: string) => pkg.trim())
              .filter((pkg: string) => allPackages.includes(pkg));

      if (targets.length === 0) {
        return {
          status: "error" as const,
          built: [],
          skipped: [],
        };
      }

      const sharedSync = await syncAndGenerateSharedUi({
        configDir: deps.configDir,
        hostMode: "local",
      });
      if (sharedSync.catalogChanged) {
        await run("bun", ["install"], { cwd: deps.configDir });
      }

      const existing: string[] = [];
      const skipped: string[] = [];
      for (const target of targets) {
        const exists = await Bun.file(`${deps.configDir}/${target}/package.json`).exists();
        if (exists) existing.push(target);
        else skipped.push(target);
      }

      if (existing.length === 0) {
        return {
          status: "error" as const,
          built: [],
          skipped,
        };
      }

      if (existing.includes("api")) {
        await run("bun", ["run", "--cwd", "packages/every-plugin", "build"], {
          cwd: deps.configDir,
        });
      }

      const env: Record<string, string> = {
        ...(process.env as Record<string, string>),
        NODE_ENV: input.deploy ? "production" : "development",
      };
      if (input.deploy) env.DEPLOY = "true";

      const built: string[] = [];
      for (const target of existing) {
        const buildConfig = buildCommands[target];
        if (!buildConfig) continue;
        await run(buildConfig.cmd, buildConfig.args, {
          cwd: `${deps.configDir}/${target}`,
          env,
        });
        built.push(target);
      }

      return {
        status: "success" as const,
        built,
        skipped,
        deployed: input.deploy,
      };
    }),
  }),
});
