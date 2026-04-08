import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EveryPluginDevServer } from "every-plugin/build/rspack";
import { withZephyr } from "zephyr-rspack-plugin";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shouldDeploy = process.env.DEPLOY === "true";

function normalizePath(input) {
  return input.replace(/\\/g, "/").replace(/\/+$/, "");
}

function resolveLocalTarget(value, configRoot) {
  if (typeof value !== "string" || !value.startsWith("local:")) {
    return null;
  }

  return normalizePath(path.resolve(configRoot, value.slice("local:".length)));
}

function updateBosConfig(url) {
  try {
    const configPath = path.resolve(__dirname, "../../bos.config.json");
    const configRoot = path.dirname(configPath);
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const pluginDir = normalizePath(__dirname);

    const match = Object.entries(config.plugins ?? {}).find(([, plugin]) => {
      return resolveLocalTarget(plugin.development, configRoot) === pluginDir;
    });

    if (!match) {
      console.warn(`   ⚠️  No matching plugin entry found for ${pluginDir}`);
      return;
    }

    const [key] = match;
    config.plugins[key].production = url;
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`   ✅ Updated bos.config.json: plugins.${key}.production`);
  } catch (err) {
    console.error("   ❌ Failed to update bos.config.json:", err.message);
  }
}

function emitPluginManifest() {
  return {
    apply(compiler) {
      compiler.hooks.thisCompilation.tap("EmitPluginManifest", (compilation) => {
        const webpack = compiler.webpack;
        const RawSource = webpack?.sources?.RawSource;
        const stage = webpack?.Compilation?.PROCESS_ASSETS_STAGE_ADDITIONS ?? 1000;

        compilation.hooks.processAssets.tapPromise(
          { name: "EmitPluginManifest", stage },
          async () => {
            const sourceContractPath = path.join(__dirname, "types", "contract.d.ts");
            const contractTypes = await fs.promises.readFile(sourceContractPath, "utf8");
            const contractSha256 = crypto.createHash("sha256").update(contractTypes).digest("hex");

            const manifest = {
              schemaVersion: 1,
              kind: "every-plugin/manifest",
              plugin: {
                name: pkg.name,
                version: pkg.version,
              },
              runtime: {
                remoteEntry: "./remoteEntry.js",
              },
              contract: {
                kind: "orpc",
                types: {
                  path: "./types/contract.d.ts",
                  exportName: "contract",
                  typeName: "ContractType",
                  sha256: contractSha256,
                },
              },
            };

            if (RawSource) {
              compilation.emitAsset(
                "plugin.manifest.json",
                new RawSource(`${JSON.stringify(manifest, null, 2)}\n`),
              );
              compilation.emitAsset("types/contract.d.ts", new RawSource(contractTypes));
            }
          },
        );
      });
    },
  };
}

const baseConfig = {
  plugins: [new EveryPluginDevServer(), emitPluginManifest()],
  infrastructureLogging: {
    level: "error",
  },
  stats: "errors-warnings",
};

export default shouldDeploy
  ? withZephyr({
      hooks: {
        onDeployComplete: (info) => {
          console.log("🚀 Template Plugin Deployed:", info.url);
          updateBosConfig(info.url);
        },
      },
    })(baseConfig)
  : baseConfig;
