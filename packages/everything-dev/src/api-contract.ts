import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface ApiPluginManifest {
  schemaVersion: 1;
  kind: "every-plugin/manifest";
  plugin: {
    name: string;
    version: string;
  };
  runtime: {
    remoteEntry: string;
  };
  contract?: {
    kind: "orpc";
    types: {
      path: string;
      exportName: string;
      typeName: string;
      sha256?: string;
    };
  };
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function trimTrailingSlash(input: string): string {
  return input.replace(/\/$/, "");
}

export function getApiPluginManifestUrl(apiBaseUrl: string): string {
  return `${trimTrailingSlash(apiBaseUrl)}/plugin.manifest.json`;
}

export async function fetchApiPluginManifest(apiBaseUrl: string): Promise<ApiPluginManifest> {
  const response = await fetch(getApiPluginManifestUrl(apiBaseUrl));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch API plugin manifest: ${response.status} ${response.statusText}`,
    );
  }

  const manifest = (await response.json()) as ApiPluginManifest;
  if (manifest.schemaVersion !== 1 || manifest.kind !== "every-plugin/manifest") {
    throw new Error("Unsupported API plugin manifest format");
  }

  return manifest;
}

export async function syncApiContractBridge(opts: {
  configDir: string;
  apiBaseUrl: string;
}): Promise<{
  bridgePath: string;
  generatedPath: string;
  manifest: ApiPluginManifest | null;
  source: "local" | "remote";
}> {
  const bridgePath = join(opts.configDir, "ui", "src", "api-contract.ts");
  const generatedPath = join(opts.configDir, ".bos", "generated", "api", "contract.d.ts");

  const bridgeTarget = existsSync(join(opts.configDir, "api", "package.json"))
    ? "../../api/src/contract"
    : "../../.bos/generated/api/contract";

  if (bridgeTarget === "../../api/src/contract") {
    writeFileSync(
      bridgePath,
      `export type { ContractType as ApiContract } from "${bridgeTarget}";\n`,
    );

    return { bridgePath, generatedPath, manifest: null, source: "local" };
  }

  const manifest = await fetchApiPluginManifest(opts.apiBaseUrl);
  if (!manifest.contract) {
    throw new Error(
      `API plugin manifest for ${manifest.plugin.name} does not advertise contract types`,
    );
  }

  const contractUrl = `${trimTrailingSlash(opts.apiBaseUrl)}/${manifest.contract.types.path.replace(/^\.\//, "")}`;

  const contractResponse = await fetch(contractUrl);
  if (!contractResponse.ok) {
    throw new Error(
      `Failed to fetch API contract types: ${contractResponse.status} ${contractResponse.statusText}`,
    );
  }

  const contractTypes = await contractResponse.text();
  if (manifest.contract.types.sha256 && manifest.contract.types.sha256 !== sha256(contractTypes)) {
    throw new Error("Fetched API contract types failed checksum verification");
  }

  mkdirSync(dirname(generatedPath), { recursive: true });
  writeFileSync(generatedPath, contractTypes);
  writeFileSync(
    bridgePath,
    `export type { ContractType as ApiContract } from "${bridgeTarget}";\n`,
  );

  return { bridgePath, generatedPath, manifest, source: "remote" };
}
