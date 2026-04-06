#!/usr/bin/env bun
import { findCommandDescriptor } from "./cli/catalog";
import { printHelp } from "./cli/help";
import { parseCommandInput } from "./cli/parse";
import { findConfigPath } from "./config";
import bosPlugin from "./plugin";
import { createPluginRuntime } from "./sdk";
import { printBanner } from "./utils/banner";
import { colors, frames, gradients, icons } from "./utils/theme";

function printConfigView(result: {
  account: string;
  domain?: string;
  app: {
    host: { name?: string; development: string; production?: string };
    ui: { name?: string; development?: string; production?: string; ssr?: string };
    api: { name?: string; development?: string; production?: string; proxy?: string };
  };
}) {
  console.log();
  console.log(colors.cyan(frames.top(52)));
  console.log(`  ${icons.app} ${gradients.cyber("CONFIG")}`);
  console.log(colors.cyan(frames.bottom(52)));
  console.log();

  console.log(`  ${colors.dim("Account")}  ${colors.cyan(result.account)}`);
  console.log(`  ${colors.dim("Domain")}   ${colors.white(result.domain ?? "not configured")}`);
  console.log();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const invocationArgs = args.length > 0 ? args : ["dev"];
  const command = invocationArgs[0] ?? "dev";
  const configPath = findConfigPath();

  const commandMatch = findCommandDescriptor(invocationArgs);
  if (!commandMatch) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  const { descriptor, consumed } = commandMatch;
  const commandArgs = invocationArgs.slice(consumed);

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

  try {
    const input = parseCommandInput(descriptor, commandArgs);
    const result = await (client as any)[descriptor.key](input);

    if (descriptor.key === "config") {
      if (!result.config) {
        console.error("No bos.config.json found");
        process.exit(1);
      }

      printConfigView(result.config);
      process.stdout.write(`${JSON.stringify(result.config, null, 2)}\n`);
      return;
    }

    if (result?.status === "error") {
      console.error(`[CLI] ${result.error || "Unknown error"}`);
      process.exit(1);
    }

    if (descriptor.key === "keyPublish") {
      process.stdout.write(`Generated publish key for ${result.account}\n`);
      process.stdout.write(`  Network: ${result.network}\n`);
      process.stdout.write(`  Contract: ${result.contract}\n`);
      process.stdout.write(`  Allowance: ${result.allowance}\n`);
      process.stdout.write(`  Functions: ${result.functionNames.join(", ")}\n`);
      process.stdout.write(`  Public key: ${result.publicKey}\n`);
      process.stdout.write(`  Private key: ${result.privateKey}\n`);
      process.stdout.write(`  Copy: NEAR_PRIVATE_KEY=${result.privateKey}\n`);
    }
  } catch (error) {
    console.error(`[CLI] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[CLI] Fatal error:", error);
  process.exit(1);
});
