#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { syncApiContractBridge } from "./api-contract";
import bosPlugin from "./bos-plugin";
import { findConfigPath, loadConfig } from "./config";
import { readDevLatestLog } from "./dev-logs";
import { createPluginRuntime } from "./plugin";
import { printBanner } from "./utils/banner";

function readFlag(args: string[], name: string, short?: string): string | undefined {
  const index = args.findIndex((arg) => arg === name || (short ? arg === short : false));
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], name: string, short?: string): boolean {
  return args.includes(name) || (short ? args.includes(short) : false);
}

function parseBosPluginId(bosUrl: string): string {
  const match = bosUrl.match(/^bos:\/\/[^/]+\/.+\/plugins\/([^/]+)$/);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  const fallback = bosUrl.split("/").filter(Boolean).at(-1);
  if (!fallback) {
    throw new Error(`Invalid BOS plugin URL: ${bosUrl}`);
  }

  return decodeURIComponent(fallback);
}

function updateBosConfig(
  configPath: string,
  updater: (config: Record<string, unknown>) => Record<string, unknown>,
) {
  const current = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
  const next = updater(current);
  writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function printHelp() {
  process.stdout.write(`everything-dev commands\n\n`);
  process.stdout.write(
    `  everything-dev dev [--host <mode>] [--ui <mode>] [--api <mode>] [--ssr] [--proxy] [--port <port>] [--no-interactive]\n`,
  );
  process.stdout.write(
    `  everything-dev start [--account <account>] [--domain <domain>] [--port <port>] [--no-interactive]\n`,
  );
  process.stdout.write(`  everything-dev build [all|host|ui|api] [--force] [--deploy]\n`);
  process.stdout.write(`  everything-dev add plugin <bos://account/gateway/plugins/pluginId>\n`);
  process.stdout.write(`  everything-dev logs [--tail <count>]\n\n`);
  process.stdout.write(`  everything-dev types sync\n\n`);
  process.stdout.write(`'bos' is an alias for 'everything-dev'.\n`);
}

async function main() {
  const args = process.argv.slice(2);

  if (hasFlag(args, "--help", "-h")) {
    printHelp();
    return;
  }

  const command = args[0] ?? "dev";
  const configPath = findConfigPath();

  if (command === "add") {
    const target = args[1];
    const bosUrl = args[2];

    if (target !== "plugin" || !bosUrl?.startsWith("bos://")) {
      console.error("Usage: everything-dev add plugin <bos://account/gateway/plugins/pluginId>");
      process.exit(1);
    }

    if (!configPath) {
      console.error("No bos.config.json found");
      process.exit(1);
    }

    const pluginId = parseBosPluginId(bosUrl);
    updateBosConfig(configPath, (config) => {
      const plugins = (config.plugins as Record<string, unknown> | undefined) ?? {};
      plugins[pluginId] = { extends: bosUrl };
      return { ...config, plugins };
    });

    process.stdout.write(`Added plugin ${pluginId} -> ${bosUrl}\n`);
    return;
  }

  if (command === "types") {
    const action = args[1] ?? "sync";
    if (action !== "sync") {
      console.error(`Unknown types command: ${action}`);
      process.exit(1);
    }

    const loaded = await loadConfig({ cwd: process.cwd() });
    if (!loaded) {
      console.error("No bos.config.json found");
      process.exit(1);
    }

    const result = await syncApiContractBridge({
      configDir: dirname(loaded.source.path),
      apiBaseUrl: loaded.runtime.api.url,
    });

    process.stdout.write(
      result.source === "local"
        ? "Synced UI contract bridge from local api package\n"
        : `Synced UI contract bridge from ${result.manifest?.plugin.name} manifest\n`,
    );
    return;
  }

  if (command === "logs") {
    const tail = Number(readFlag(args, "--tail", "-n") ?? "0") || undefined;
    const configDir = configPath ? configPath.replace(/\/bos\.config\.json$/, "") : process.cwd();
    const text = await readDevLatestLog(configDir, { tail });
    process.stdout.write(text || "(no logs found)\n");
    return;
  }

  printBanner();

  const runtime = createPluginRuntime({
    registry: {
      bos: { module: bosPlugin },
    },
    secrets: {},
  });

  const pluginRuntime: any = runtime;
  const loadPlugin = pluginRuntime.usePlugin.bind(pluginRuntime);
  const plugin = await loadPlugin("bos", {
    variables: {
      configPath: configPath ?? undefined,
    },
    secrets: {},
  });

  const client = plugin.createClient();

  if (command === "dev") {
    const result = await client.dev({
      host: (readFlag(args, "--host") as "local" | "remote" | undefined) ?? "local",
      ui: (readFlag(args, "--ui") as "local" | "remote" | undefined) ?? "local",
      api: (readFlag(args, "--api") as "local" | "remote" | undefined) ?? "local",
      proxy: hasFlag(args, "--proxy"),
      ssr: hasFlag(args, "--ssr"),
      port: readFlag(args, "--port", "-p") ? Number(readFlag(args, "--port", "-p")) : undefined,
      interactive: hasFlag(args, "--no-interactive") ? false : undefined,
    });
    if (result.status === "error") process.exit(1);
    return;
  }

  if (command === "start") {
    const result = await client.start({
      port: readFlag(args, "--port", "-p") ? Number(readFlag(args, "--port", "-p")) : undefined,
      account: readFlag(args, "--account"),
      domain: readFlag(args, "--domain"),
      interactive: hasFlag(args, "--no-interactive") ? false : undefined,
    });
    if (result.status === "error") process.exit(1);
    return;
  }

  if (command === "build") {
    const pkgArg = args[1] && !args[1]?.startsWith("-") ? args[1] : "all";
    const result = await client.build({
      packages: pkgArg,
      force: hasFlag(args, "--force"),
      deploy: hasFlag(args, "--deploy"),
    });
    if (result.status === "error") process.exit(1);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((error) => {
  console.error("[CLI] Fatal error:", error);
  process.exit(1);
});
