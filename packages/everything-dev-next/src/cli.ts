#!/usr/bin/env bun
import bosPlugin from "./bos-plugin";
import { findConfigPath } from "./config";
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

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "dev";
  const configPath = findConfigPath();

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
