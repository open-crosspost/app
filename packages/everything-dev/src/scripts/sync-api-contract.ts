#!/usr/bin/env bun

import { dirname } from "node:path";
import { syncApiContractBridge } from "../api-contract";
import { loadConfig } from "../config";

async function main() {
  const result = await loadConfig({ cwd: process.cwd(), env: "development" });
  if (!result) {
    throw new Error("No bos.config.json found");
  }

  const configDir = dirname(result.source.path);
  await syncApiContractBridge({
    configDir,
    runtimeConfig: result.runtime,
    apiBaseUrl: result.runtime.api.url,
  });
}

main().catch((error) => {
  console.error("[sync-api-contract]", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
